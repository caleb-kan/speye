import {
  saveQuizResult as saveQuizResultDb,
  type QuizResultParams,
} from '../../../backend/supabase/database/userActivity/saveQuizResult'
import { getErrorMessage } from '../utils/getErrorMessage'

export type { QuizResultParams }

export async function saveQuizResult(params: QuizResultParams) {
  if (!params.text_id) {
    throw new Error('Text ID is required')
  }

  if (Number.isNaN(params.score)) {
    throw new Error('Score must be a number')
  }

  try {
    return await saveQuizResultDb(params)
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to save quiz result'))
  }
}
