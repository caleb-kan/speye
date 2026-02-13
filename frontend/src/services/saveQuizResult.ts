import {
  saveQuizResult as saveQuizResultDb,
  type QuizResultParams,
} from '../../../backend/supabase/database/userActivity/saveQuizResult'
import { getErrorMessage } from '../utils/getErrorMessage'
import { updateLeaderboardCache } from './leaderboardService'

export type { QuizResultParams }

export async function saveQuizResult(params: QuizResultParams) {
  if (!params.text_id) {
    throw new Error('Text ID is required')
  }

  if (Number.isNaN(params.score)) {
    throw new Error('Score must be a number')
  }

  try {
    const data = await saveQuizResultDb(params)

    // Fire-and-forget: cache update should not block quiz save
    if (data?.user_id) {
      updateLeaderboardCache(params.text_id, data.user_id)
    }

    return data
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to save quiz result'))
  }
}
