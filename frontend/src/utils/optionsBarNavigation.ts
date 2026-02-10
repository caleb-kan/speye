import type { LocationState } from '../types'
import type { Text } from '../types/database'

export type BuildModeNavigationStateParams = {
  includeTimestamp: boolean
  readingPosition: number
  libraryText?: Text | null
  currentText?: Text | null
}

export const buildModeNavigationState = ({
  includeTimestamp,
  readingPosition,
  libraryText,
  currentText,
}: BuildModeNavigationStateParams): LocationState => {
  const textToPass = libraryText || currentText
  const baseState: LocationState = { readingPosition }

  if (includeTimestamp) {
    baseState._ts = Date.now()
  }

  if (!textToPass) {
    return baseState
  }

  if (libraryText) {
    return { ...baseState, libraryText: textToPass }
  }

  return { ...baseState, preservedText: textToPass }
}
