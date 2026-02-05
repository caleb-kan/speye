import { useEffect, useRef, useState } from 'react'

type UseReadingPositionSyncOptions = {
  /** Current text ID (null if no text) */
  textId: string | null
  /** Initial reading position from navigation state */
  initialPosition: number
  /** Timestamp from navigation state (used to detect mode switches) */
  modeTimestamp: number | undefined
}

type UseReadingPositionSyncReturn = {
  /** Current reading position */
  position: number
  /** Update reading position */
  setPosition: (position: number) => void
  /** Reset position to 0 (for new text button) */
  resetPosition: () => void
}

/**
 * Hook for managing reading position state with automatic syncing.
 *
 * Handles two scenarios:
 * 1. Mode switch (timestamp changes): restore position from navigation state
 * 2. Text change (textId changes): reset position to 0
 *
 * Used by both ReadingLayout (standard mode) and Adaptive page.
 */
export function useReadingPositionSync({
  textId,
  initialPosition,
  modeTimestamp,
}: UseReadingPositionSyncOptions): UseReadingPositionSyncReturn {
  const [position, setPosition] = useState(initialPosition)

  const prevTextIdRef = useRef<string | null>(textId)
  const prevModeTimestampRef = useRef<number | undefined>(modeTimestamp)

  useEffect(() => {
    // Sync position with navigation state when switching modes
    if (modeTimestamp !== prevModeTimestampRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with navigation state on mode switch
      setPosition(initialPosition)
      prevModeTimestampRef.current = modeTimestamp
      prevTextIdRef.current = textId
      return
    }

    // Reset position when text changes (new text loaded)
    if (textId !== null && textId !== prevTextIdRef.current) {
      setPosition(0)
      prevTextIdRef.current = textId
    }
  }, [textId, modeTimestamp, initialPosition])

  const resetPosition = () => setPosition(0)

  return {
    position,
    setPosition,
    resetPosition,
  }
}
