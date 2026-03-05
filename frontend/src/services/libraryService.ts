import type { Text, TextInput, TextPreview, Quiz } from '../types/database'
import { deleteText } from '../../../backend/supabase/database/texts/deleteText'
import { getLibraryTexts } from '../../../backend/supabase/database/texts/getLibraryTexts'
import { getTextBestScores } from '../../../backend/supabase/database/texts/getTextBestScores'
import { getLastReadDates } from '../../../backend/supabase/database/userActivity/getLastReadDates'
import { getRecentlyQuizzedTextIds } from '../../../backend/supabase/database/userActivity/getRecentlyQuizzedTextIds'
import { getTextContent } from '../../../backend/supabase/database/texts/getTextContent'
import { retryProcessing } from '../../../backend/supabase/database/texts/retryProcessing'
import { updateText } from '../../../backend/supabase/database/texts/updateText'
import { updateTextQuiz } from '../../../backend/supabase/database/texts/updateTextQuiz'
import { uploadText } from '../../../backend/supabase/database/texts/uploadText'
import {
  getCachedLibraryTexts,
  setCachedLibraryTexts,
  getCachedText,
  setCachedText,
  getCachedBestScores,
  setCachedBestScores,
  getCachedLastReadDates,
  setCachedLastReadDates,
  getCachedRecentlyQuizzedTextIds,
  setCachedRecentlyQuizzedTextIds,
} from './offlineCache'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'
import { OFFLINE_WRITE_ERROR } from '../constants/offline'

const TAG = 'libraryService'

export const fetchPublicLibraryTexts = async (): Promise<TextPreview[]> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached public library texts')
    return (await getCachedLibraryTexts('public')) ?? []
  }

  try {
    const texts = await getLibraryTexts({ type: 'public' })
    void setCachedLibraryTexts('public', texts)
    return texts
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for public texts, falling back to cache',
      err
    )
    const cached = await getCachedLibraryTexts('public')
    if (cached) return cached
    throw err
  }
}

export const fetchUserLibraryTexts = async (
  userId: string
): Promise<TextPreview[]> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached user library texts', {
      userId,
    })
    return (await getCachedLibraryTexts(`user:${userId}`)) ?? []
  }

  try {
    const texts = await getLibraryTexts({ type: 'user', userId })
    void setCachedLibraryTexts(`user:${userId}`, texts)
    return texts
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for user texts, falling back to cache',
      err
    )
    const cached = await getCachedLibraryTexts(`user:${userId}`)
    if (cached) return cached
    throw err
  }
}

export const fetchTextContent = async (
  textId: string
): Promise<{ content: string; summary: string | null }> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached text content', { textId })
    const cached = await getCachedText(textId)
    if (cached) {
      return { content: cached.content, summary: cached.summary }
    }
    throw new Error('Text not available offline')
  }

  try {
    const result = await getTextContent(textId)
    const cached = await getCachedText(textId)
    if (cached) {
      void setCachedText({
        ...cached,
        content: result.content,
        summary: result.summary,
      })
    }
    return result
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for text content, falling back to cache',
      err
    )
    const cached = await getCachedText(textId)
    if (cached) {
      return { content: cached.content, summary: cached.summary }
    }
    throw err
  }
}

export const fetchTextBestScores = async (
  userId: string
): Promise<Record<string, number>> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached best scores', { userId })
    return (await getCachedBestScores(userId)) ?? {}
  }

  try {
    const scores = await getTextBestScores(userId)
    void setCachedBestScores(userId, scores)
    return scores
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for best scores, falling back to cache',
      err
    )
    const cached = await getCachedBestScores(userId)
    if (cached) return cached
    throw err
  }
}

export const fetchLastReadDates = async (
  userId: string
): Promise<Record<string, string>> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached last read dates', {
      userId,
    })
    return (await getCachedLastReadDates(userId)) ?? {}
  }

  try {
    const dates = await getLastReadDates(userId)
    void setCachedLastReadDates(userId, dates).catch((err) =>
      pwaLogger.warn(TAG, 'Failed to cache last read dates', err)
    )
    return dates
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for last read dates, falling back to cache',
      err
    )
    const cached = await getCachedLastReadDates(userId)
    if (cached) return cached
    throw err
  }
}

export const fetchRecentlyQuizzedTextIds = async (
  userId: string
): Promise<string[]> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached recently quizzed IDs', {
      userId,
    })
    return (await getCachedRecentlyQuizzedTextIds(userId)) ?? []
  }

  try {
    const ids = await getRecentlyQuizzedTextIds(userId)
    void setCachedRecentlyQuizzedTextIds(userId, ids).catch((err) =>
      pwaLogger.warn(TAG, 'Failed to cache recently quizzed IDs', err)
    )
    return ids
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for recently quizzed IDs, falling back to cache',
      err
    )
    const cached = await getCachedRecentlyQuizzedTextIds(userId)
    if (cached) return cached
    throw err
  }
}

export const uploadLibraryText = async (
  userId: string,
  payload: TextInput & { processing_status: 'pending' }
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked upload — offline')
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  await uploadText(userId, payload)
}

export const deleteLibraryText = async (textId: string): Promise<void> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked delete — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  await deleteText(textId)
}

export const retryLibraryTextProcessing = async (
  textId: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked retry processing — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  await retryProcessing(textId)
}

export const updateLibraryText = async (
  textId: string,
  payload: TextInput & { quiz: null; quiz_valid: false; summary: null }
): Promise<Text> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked text update — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  return updateText(textId, payload)
}

export const updateLibraryTextQuiz = async (
  textId: string,
  quiz: Quiz
): Promise<Text> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked quiz update — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  return updateTextQuiz(textId, quiz)
}
