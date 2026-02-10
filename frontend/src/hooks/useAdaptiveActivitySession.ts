import { useCallback, useEffect } from 'react'
import type { Text } from '../types/database'
import { logUserActivity } from '../services/logUserActivity'
import {
  clearReadingActivitySession,
  loadReadingActivitySession,
  upsertReadingActivitySession,
} from '../utils/readingActivityStorage'

export type UseAdaptiveActivitySessionParams = {
  currentText: Text | null
  adaptiveSessionWpm: number | null
  readingPosition: number
  fallbackWpm: number
}

export type UseAdaptiveActivitySessionResult = {
  handleModeNavigate: () => void
}

export const useAdaptiveActivitySession = (
  params: UseAdaptiveActivitySessionParams
): UseAdaptiveActivitySessionResult => {
  const { currentText, adaptiveSessionWpm, readingPosition, fallbackWpm } =
    params

  useEffect(() => {
    if (!adaptiveSessionWpm || !currentText) return
    upsertReadingActivitySession({
      textId: currentText.id,
      wpm: Math.round(adaptiveSessionWpm),
      mode: 'adaptive',
    })
  }, [adaptiveSessionWpm, currentText])

  const handleModeNavigate = useCallback((): void => {
    if (!currentText) return
    const session = loadReadingActivitySession()
    if (!session?.started || session.textId !== currentText.id) return

    const effectiveWpm = adaptiveSessionWpm
      ? Math.round(adaptiveSessionWpm)
      : (session.wpm ?? fallbackWpm)

    const effectiveProgress = Math.max(
      session.progressIndex ?? 0,
      readingPosition
    )

    void logUserActivity({
      textId: currentText.id,
      wpm: effectiveWpm,
      startTime: session.startTime ?? new Date().toISOString(),
      endTime: new Date().toISOString(),
      mode: session.mode ?? 'adaptive',
      progressIndex: effectiveProgress,
    })

    clearReadingActivitySession()
  }, [adaptiveSessionWpm, currentText, fallbackWpm, readingPosition])

  return { handleModeNavigate }
}
