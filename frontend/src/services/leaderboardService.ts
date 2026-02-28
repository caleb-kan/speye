import { getTextLeaderboard as getTextLeaderboardDb } from '../../../backend/redis/getTextLeaderboard'
import type { LeaderboardEntry } from '../../../backend/redis/types'
import { updateLeaderboardCache as updateLeaderboardCacheDb } from '../../../backend/supabase/database/leaderboard/updateLeaderboardCache'
import { getErrorMessage } from '../utils/getErrorMessage'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'

const TAG = 'leaderboardService'

export type { LeaderboardEntry }

export async function getTextLeaderboard(
  textId: string,
  currentUserId?: string
): Promise<{ top: LeaderboardEntry[]; currentUser: LeaderboardEntry | null }> {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning empty leaderboard')
    return { top: [], currentUser: null }
  }

  try {
    return await getTextLeaderboardDb(textId, currentUserId)
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
    console.error('Leaderboard cache update failed:', err)
  }
}
