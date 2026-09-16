import {
  getQueuedOperations,
  removeOperation,
  updateOperation,
  type QueuedOperation,
} from './operationQueue'
// syncService calls DB functions directly (bypassing service wrappers) to avoid
// re-queuing operations that are already in the queue. The service wrappers
// (logUserActivity, saveQuizResult, markNotificationSeen, markAllNotificationsSeen,
// markNotificationToastShown) detect offline state and enqueue — calling them here
// would create an infinite retry loop.
import { logUserActivity as logUserActivityDb } from '../../../backend/supabase/database/userActivity/logUserActivity'
import { saveQuizResult as saveQuizResultDb } from '../../../backend/supabase/database/userActivity/saveQuizResult'
import { markNotificationSeen as markNotificationSeenDb } from '../../../backend/supabase/database/notifications/markNotificationSeen'
import { markAllNotificationsSeen as markAllNotificationsSeenDb } from '../../../backend/supabase/database/notifications/markAllNotificationsSeen'
import { markNotificationToastShown as markNotificationToastShownDb } from '../../../backend/supabase/database/notifications/markNotificationToastShown'
import { updateLeaderboardCache } from './leaderboardService'
import { setLastSyncTime } from './offlineCache'
import { SYNC } from '../constants/offline'
import { pwaLogger } from '../utils/pwaLogger'
import { supabase } from '../../../lib/supabase'

const TAG = 'syncService'

// IndexedDB is shared by every tab. Keep recovery and replay in one origin-wide
// critical section so reconnecting tabs cannot submit the same operation twice.
export async function syncPendingOperations(): Promise<void> {
  const sync = async () => {
    if (await recoverUnloadQueue()) await processQueue()
  }
  if (navigator.locks) {
    await navigator.locks.request('speye-operation-sync', sync)
  } else {
    await sync()
  }
}

async function executeOperation(op: QueuedOperation): Promise<void> {
  switch (op.type) {
    case 'logUserActivity':
      await logUserActivityDb(op.payload, op.userId)
      break
    case 'saveQuizResult': {
      const data = await saveQuizResultDb(op.payload, op.userId)
      if (data?.user_id) {
        await updateLeaderboardCache(op.payload.text_id, data.user_id)
      }
      break
    }
    case 'markNotificationSeen':
      await markNotificationSeenDb(op.payload.id)
      break
    case 'markAllNotificationsSeen':
      await markAllNotificationsSeenDb(op.payload.userId)
      break
    case 'markNotificationToastShown':
      await markNotificationToastShownDb(op.payload.id)
      break
  }
}

export async function processQueue(): Promise<void> {
  const operations = await getQueuedOperations()
  pwaLogger.info(TAG, `Processing queue: ${operations.length} operations`)

  let anySucceeded = false
  const discardedQuizzes = new Set<string>()

  for (const [index, op] of operations.entries()) {
    if (discardedQuizzes.has(op.id)) continue
    const {
      data: { session },
    } = await supabase.auth.getSession()
    // Leave work queued while signed out. On account changes, discard records
    // that belong to someone else, including legacy records with no owner.
    if (!session?.user) break
    if (!op.userId || op.userId !== session.user.id) {
      await removeOperation(op.id)
      continue
    }
    if (op.retryCount >= SYNC.MAX_RETRY_COUNT) {
      pwaLogger.warn(TAG, `Dropping operation after ${op.retryCount} retries`, {
        id: op.id,
        type: op.type,
      })
      if (op.type === 'logUserActivity') {
        // Remove dependent quizzes before abandoning their activity, including
        // when a later operation fails and replay resumes in a different run.
        for (const next of operations.slice(index + 1)) {
          if (next.userId !== op.userId) continue
          if (
            next.type === 'logUserActivity' &&
            next.payload.textId === op.payload.textId
          )
            break
          if (
            next.type === 'saveQuizResult' &&
            next.payload.text_id === op.payload.textId
          ) {
            await removeOperation(next.id)
            discardedQuizzes.add(next.id)
          }
        }
      }
      await removeOperation(op.id)
      continue
    }

    try {
      await executeOperation(op)
      pwaLogger.debug(TAG, `Synced operation: ${op.type}`, { id: op.id })
      await removeOperation(op.id)
      anySucceeded = true
    } catch (err) {
      // Spread into a new object to avoid mutating the localforage-stored reference
      const updated = { ...op, retryCount: op.retryCount + 1 }
      pwaLogger.warn(
        TAG,
        `Operation failed (retry ${updated.retryCount}): ${op.type}`,
        err
      )
      await updateOperation(updated)
      // Later operations can depend on this write, especially quiz scores.
      // Resume in order on the next sync instead of applying them prematurely.
      break
    }
  }

  // Update the sync timestamp when:
  //   • the queue was empty (the system is already fully in sync), or
  //   • at least one pending operation succeeded.
  // Don't update if every operation failed to avoid showing a misleadingly
  // recent "last synced" time when nothing was actually committed.
  if (anySucceeded || operations.length === 0) {
    await setLastSyncTime()
  }
  pwaLogger.info(TAG, 'Queue processing complete')
}

export async function recoverUnloadQueue(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) return false
    const raw = localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)
    if (!raw) return true

    let entries: QueuedOperation[]
    try {
      entries = JSON.parse(raw)
      if (!Array.isArray(entries)) throw new Error('Invalid unload queue')
    } catch (err) {
      pwaLogger.error(TAG, 'Invalid unload queue', err)
      localStorage.removeItem(SYNC.UNLOAD_QUEUE_KEY)
      return true
    }
    pwaLogger.info(
      TAG,
      `Recovering ${entries.length} operations from unload queue`
    )
    for (const entry of entries) {
      if (entry.userId === session.user.id) {
        // Preserve chronology and identity. Retrying a partial transfer writes
        // the same keys, so it cannot duplicate previously persisted entries.
        await updateOperation(entry)
      }
    }
    // Another tab can append synchronously while the IndexedDB writes await.
    // Keep that newer queue intact and finish recovery before replaying it.
    if (localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY) !== raw) return false
    localStorage.removeItem(SYNC.UNLOAD_QUEUE_KEY)
    return true
  } catch (err) {
    pwaLogger.error(TAG, 'Failed to recover unload queue', err)
    return false
  }
}
