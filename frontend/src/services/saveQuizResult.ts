import {
  saveQuizResult as saveQuizResultDb,
  type QuizResultParams,
} from '../../../backend/supabase/database/userActivity/saveQuizResult'
import { updateLeaderboardCache } from './leaderboardService'
import { enqueueOperation } from './operationQueue'
import { getCachedBestScores, setCachedBestScores } from './offlineCache'
import { getCurrentUser } from './authService'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'

const TAG = 'saveQuizResult'

export type { QuizResultParams }

export async function saveQuizResult(params: QuizResultParams) {
  if (!params.text_id) {
    throw new Error('Text ID is required')
  }

  if (Number.isNaN(params.score)) {
    throw new Error('Score must be a number')
  }

  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — queuing quiz result', {
      textId: params.text_id,
      score: params.score,
    })
    await enqueueOperation('saveQuizResult', params)

    // Update cached best scores optimistically
    const user = await getCurrentUser()
    if (user) {
      const cached = (await getCachedBestScores(user.id)) ?? {}
      const existing = cached[params.text_id] ?? 0
      if (params.score > existing) {
        cached[params.text_id] = params.score
        await setCachedBestScores(user.id, cached)
      }
    }

    // Return mock response so UI still works
    return {
      user_id: user?.id ?? null,
      text_id: params.text_id,
      score: params.score,
    }
  }

  try {
    const data = await saveQuizResultDb(params)

    // Fire-and-forget: cache update should not block quiz save
    if (data?.user_id) {
      updateLeaderboardCache(params.text_id, data.user_id)
    }

    return data
  } catch {
    // The network may have dropped mid-request after the offline check passed.
    // Queue for retry rather than silently losing the quiz result.
    pwaLogger.warn(TAG, 'Network failure — queuing quiz result for retry', {
      textId: params.text_id,
    })
    await enqueueOperation('saveQuizResult', params)
    const user = await getCurrentUser()
    return {
      user_id: user?.id ?? null,
      text_id: params.text_id,
      score: params.score,
    }
  }
}
