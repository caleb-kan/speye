import { useCallback } from 'react'
import type { Text } from '../types/database'
import type { Mode } from '../types/reading'
import { logUserActivity } from '../services/logUserActivity'
import {
  clearReadingActivitySession,
  loadReadingActivitySession,
  upsertReadingActivitySession,
} from '../utils/readingActivityStorage'

export type UseRsvpActivitySessionParams = {
  currentText: Text | null
  readingPosition: number
  fallbackWpm: number
}

export type UseRsvpActivitySessionResult = {
  handleModeNavigate: (targetMode: Mode) => void
}

export const useRsvpActivitySession = (
  params: UseRsvpActivitySessionParams
): UseRsvpActivitySessionResult => {
  const { currentText, readingPosition, fallbackWpm } = params

  const handleModeNavigate = useCallback(
    (targetMode: Mode): void => {
      if (!currentText) return
      const session = loadReadingActivitySession()
      if (!session?.started || session.textId !== currentText.id) return

      const effectiveProgress = Math.max(
        session.progressIndex ?? 0,
        readingPosition
      )

      void logUserActivity({
        textId: currentText.id,
        wpm: session.wpm ?? fallbackWpm,
        startTime: session.startTime ?? new Date().toISOString(),
        endTime: new Date().toISOString(),
        mode: session.mode ?? 'rsvp',
        progressIndex: effectiveProgress,
      })

      clearReadingActivitySession()

      // Only bootstrap a new session for non-standard modes. Standard mode
      // creates its own session via useReadingActivitySession on mount.
      if (targetMode !== 'standard') {
        upsertReadingActivitySession({
          textId: currentText.id,
          startTime: null,
          started: false,
          mode: targetMode,
          progressIndex: effectiveProgress,
        })
      }
    },
    [currentText, fallbackWpm, readingPosition]
  )

  return { handleModeNavigate }
}
