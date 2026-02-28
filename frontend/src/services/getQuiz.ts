import { getQuiz as getQuizDb } from '../../../backend/supabase/database/texts/getQuiz'
import { getErrorMessage } from '../utils/getErrorMessage'
import { getCachedQuiz } from './offlineCache'
import { pwaLogger } from '../utils/pwaLogger'
import type { QuestionSet } from '../types/database'
import { isOffline } from './networkStatus'

const TAG = 'getQuiz'

export async function getQuiz(textId: string): Promise<QuestionSet> {
  if (!textId) {
    throw new Error('Text ID is required')
  }

  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached quiz', { textId })
    return getQuizFromCache(textId)
  }

  try {
    return await getQuizDb(textId)
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for quiz, falling back to cache',
      err
    )
    try {
      return await getQuizFromCache(textId)
    } catch {
      throw new Error(getErrorMessage(err, 'Failed to load quiz'))
    }
  }
}

async function getQuizFromCache(textId: string): Promise<QuestionSet> {
  const cached = await getCachedQuiz(textId)
  if (
    !cached ||
    !Array.isArray(cached.questionSets) ||
    cached.questionSets.length === 0
  ) {
    throw new Error('Quiz not available offline')
  }
  const randomIndex = Math.floor(Math.random() * cached.questionSets.length)
  pwaLogger.debug(TAG, 'Returning cached quiz', {
    textId,
    setIndex: randomIndex,
  })
  return cached.questionSets[randomIndex]
}
