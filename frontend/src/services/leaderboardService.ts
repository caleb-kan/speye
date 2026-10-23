import { getTextLeaderboard as getTextLeaderboardDb } from '../../../backend/redis/getTextLeaderboard'
import { getTextLeaderboard as getTextLeaderboardFallback } from '../../../backend/supabase/database/leaderboard/getTextLeaderboard'
import type { LeaderboardEntry } from '../../../backend/redis/types'
import { updateLeaderboardCache as updateLeaderboardCacheDb } from '../../../backend/supabase/database/leaderboard/updateLeaderboardCache'
import { getErrorMessage } from '../utils/getErrorMessage'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'

const TAG = 'leaderboardService'
const pendingCacheWarms = new Set<string>()

export type { LeaderboardEntry }

export async function getTextLeaderboard(
  textId: string,
  currentUserId?: string
): Promise<{ top: LeaderboardEntry[]; currentUser: LeaderboardEntry | null }> {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning empty leaderboard')
    return { top: [], currentUser: null }
  }

  let cacheIsEmpty = false
  try {
    const cached = await getTextLeaderboardDb(textId, currentUserId)
    if (cached.top.length > 0) return cached
    cacheIsEmpty = true
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Leaderboard cache unavailable; loading saved results',
      err
    )
  }

  try {
    const saved = await getTextLeaderboardFallback(textId, currentUserId)
    if (cacheIsEmpty && currentUserId && saved.top.length > 0) {
      const key = `${textId}:${currentUserId}`
      if (!pendingCacheWarms.has(key)) {
        pendingCacheWarms.add(key)
        void updateLeaderboardCache(textId, currentUserId).finally(() => {
          pendingCacheWarms.delete(key)
        })
      }
    }
    return saved
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load leaderboard'))
  }
}

export async function updateLeaderboardCache(
  textId: string,
  userId: string
): Promise<void> {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — skipping leaderboard cache update')
    return
  }

  try {
    await updateLeaderboardCacheDb(textId, userId)
  } catch (err) {
    // Don't throw - cache update failure shouldn't block the user
    pwaLogger.error(TAG, 'Leaderboard cache update failed', err)
  }
}
