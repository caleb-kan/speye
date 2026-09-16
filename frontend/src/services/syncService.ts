import {
  getQueuedOperations,
  removeOperation,
  updateOperation,
  enqueueOperation,
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
    await recoverUnloadQueue()
    await processQueue()
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

  for (const op of operations) {
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

export async function recoverUnloadQueue(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) return
    const raw = localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)
    if (!raw) return

    const entries: QueuedOperation[] = JSON.parse(raw)
    pwaLogger.info(
      TAG,
      `Recovering ${entries.length} operations from unload queue`
    )
    localStorage.removeItem(SYNC.UNLOAD_QUEUE_KEY)

    for (const entry of entries) {
      if (entry.userId) {
        await enqueueOperation(entry.type, entry.payload, entry.userId)
      }
    }
  } catch (err) {
    pwaLogger.error(TAG, 'Failed to recover unload queue', err)
    localStorage.removeItem(SYNC.UNLOAD_QUEUE_KEY)
  }
}
