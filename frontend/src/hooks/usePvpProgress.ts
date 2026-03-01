import { useRef, useCallback } from 'react'
import { PVP_PROGRESS_BROADCAST_INTERVAL_MS } from '../constants/pvp'
import type { ProgressPayload } from './usePvpGameChannel'

type ProgressOptions = {
  userId: string | null
  totalWords: number
  sendProgress: (payload: ProgressPayload) => void
  enabled: boolean
}

export function usePvpProgress({
  userId,
  totalWords,
  sendProgress,
  enabled,
}: ProgressOptions) {
  const lastBroadcastRef = useRef(0)

  const updateProgress = useCallback(
    (wordIndex: number, percent: number) => {
      if (!enabled || !userId) return

      const now = Date.now()
      if (
        percent >= 100 ||
        now - lastBroadcastRef.current >= PVP_PROGRESS_BROADCAST_INTERVAL_MS
      ) {
        sendProgress({ userId, wordIndex, totalWords, percent })
        lastBroadcastRef.current = now
      }
    },
    [enabled, userId, totalWords, sendProgress]
  )

  return { updateProgress }
}
