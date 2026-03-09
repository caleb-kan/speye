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

    const user = await getCurrentUser()
    if (user) {
      const cached = (await getCachedBestScores(user.id)) ?? {}
      const existing = cached[params.text_id] ?? 0
      if (params.score > existing) {
        cached[params.text_id] = params.score
        await setCachedBestScores(user.id, cached)
      }
    }

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
  } catch (err) {
    // Only queue for retry on network-like errors. Non-retryable errors
    // (e.g. RLS violations, constraint errors) should propagate so the
    // caller can show feedback rather than silently retrying until dropped.
    const message =
      err instanceof Error ? err.message.toLowerCase() : String(err)
    const isNetworkError =
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('aborted')

    if (isNetworkError) {
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

    throw err
  }
}
