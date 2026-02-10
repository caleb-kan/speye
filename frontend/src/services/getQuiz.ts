import { getQuiz as getQuizDb } from '../../../backend/supabase/database/texts/getQuiz'
import { getErrorMessage } from '../utils/getErrorMessage'

export async function getQuiz(textId: string) {
  if (!textId) {
    throw new Error('Text ID is required')
  }

  try {
    return await getQuizDb(textId)
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load quiz'))
  }
}
