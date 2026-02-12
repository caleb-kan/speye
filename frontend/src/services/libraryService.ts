import type { Text, TextInput, TextPreview } from '../types/database'
import { deleteText } from '../../../backend/supabase/database/texts/deleteText'
import { getLibraryTexts } from '../../../backend/supabase/database/texts/getLibraryTexts'
import { getTextBestScores } from '../../../backend/supabase/database/texts/getTextBestScores'
import { getTextContent } from '../../../backend/supabase/database/texts/getTextContent'
import { retryProcessing } from '../../../backend/supabase/database/texts/retryProcessing'
import { updateText } from '../../../backend/supabase/database/texts/updateText'
import { uploadText } from '../../../backend/supabase/database/texts/uploadText'

export const fetchPublicLibraryTexts = async (): Promise<TextPreview[]> => {
  return getLibraryTexts({ type: 'public' })
}

export const fetchUserLibraryTexts = async (
  userId: string
): Promise<TextPreview[]> => {
  return getLibraryTexts({ type: 'user', userId })
}

export const fetchTextContent = async (
  textId: string
): Promise<{ content: string; summary: string | null }> => {
  return getTextContent(textId)
}

export const fetchTextBestScores = async (
  userId: string
): Promise<Record<string, number>> => {
  return getTextBestScores(userId)
}

export const uploadLibraryText = async (
  userId: string,
  payload: TextInput & { processing_status: 'pending' }
): Promise<void> => {
  await uploadText(userId, payload)
}

export const deleteLibraryText = async (textId: string): Promise<void> => {
  await deleteText(textId)
}

export const retryLibraryTextProcessing = async (
  textId: string
): Promise<void> => {
  await retryProcessing(textId)
}

export const updateLibraryText = async (
  textId: string,
  payload: TextInput & { quiz: null; quiz_valid: false; summary: null }
): Promise<Text> => {
  return updateText(textId, payload)
}
