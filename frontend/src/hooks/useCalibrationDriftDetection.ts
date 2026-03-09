import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DRIFT_UNRELIABLE_DURATION_MS,
  DRIFT_RECOVERY_DURATION_MS,
  DRIFT_WARMUP_PERIOD_MS,
  DRIFT_POLL_INTERVAL_MS,
  DRIFT_DEGRADING_RATIO,
} from '../constants/calibration'
import type { DriftStatus } from '../types/adaptive'

type UseCalibrationDriftDetectionOptions = {
  isReliable: boolean
  isReadingActive: boolean
  isCalibrated: boolean
}

type UseCalibrationDriftDetectionReturn = {
  status: DriftStatus
  shouldRecalibrate: boolean
  unreliableDuration: number
  dismissSuggestion: () => void
  reset: () => void
}

/**
 * Monitors gaze tracking quality during reading and suggests recalibration
 * when tracking has been unreliable for an extended period.
 */
export function useCalibrationDriftDetection({
  isReliable,
  isReadingActive,
  isCalibrated,
}: UseCalibrationDriftDetectionOptions): UseCalibrationDriftDetectionReturn {
  const [status, setStatus] = useState<DriftStatus>('good')
  const [shouldRecalibrate, setShouldRecalibrate] = useState(false)
  const [unreliableDuration, setUnreliableDuration] = useState(0)

  const isReliableRef = useRef(isReliable)
  const unreliableStartRef = useRef<number | null>(null)
  const reliableStartRef = useRef<number | null>(null)
  const readingStartRef = useRef<number | null>(null)
  const dismissedRef = useRef(false)

  useEffect(() => {
    const wasReliable = isReliableRef.current
    isReliableRef.current = isReliable

    const now = Date.now()
    if (isReliable && !wasReliable) {
      reliableStartRef.current = now
      unreliableStartRef.current = null
      // Reset dismissed state on recovery so warning can reappear if tracking degrades again
      dismissedRef.current = false
    } else if (!isReliable && wasReliable) {
      unreliableStartRef.current = now
      reliableStartRef.current = null
    }
  }, [isReliable])

  useEffect(() => {
    if (isReadingActive && isCalibrated) {
      if (readingStartRef.current === null) {
        readingStartRef.current = Date.now()
      }
    } else {
      readingStartRef.current = null
      unreliableStartRef.current = null
      reliableStartRef.current = null
    }
  }, [isReadingActive, isCalibrated])

  useEffect(() => {
    if (!isReadingActive || !isCalibrated) return

    const pollStatus = () => {
      const now = Date.now()
      const readingStart = readingStartRef.current
      if (readingStart === null) return

      if (now - readingStart < DRIFT_WARMUP_PERIOD_MS) return

      if (isReliableRef.current) {
        setUnreliableDuration(0)
        const reliableStart = reliableStartRef.current
        if (
          reliableStart &&
          now - reliableStart >= DRIFT_RECOVERY_DURATION_MS
        ) {
          setStatus('good')
        }
      } else {
        const unreliableStart = unreliableStartRef.current
        if (unreliableStart) {
          const duration = now - unreliableStart
          setUnreliableDuration(duration)

          if (duration >= DRIFT_UNRELIABLE_DURATION_MS) {
            setStatus('poor')
            if (!dismissedRef.current) {
              setShouldRecalibrate(true)
            }
          } else if (
            duration >
            DRIFT_UNRELIABLE_DURATION_MS * DRIFT_DEGRADING_RATIO
          ) {
            setStatus('degrading')
          }
        }
      }
    }

    const intervalId = setInterval(pollStatus, DRIFT_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [isReadingActive, isCalibrated])

  const dismissSuggestion = useCallback(() => {
    dismissedRef.current = true
    setShouldRecalibrate(false)
  }, [])

  const reset = useCallback(() => {
    setStatus('good')
    setShouldRecalibrate(false)
    setUnreliableDuration(0)
    unreliableStartRef.current = null
    reliableStartRef.current = null
    readingStartRef.current = null
    dismissedRef.current = false
  }, [])

  return {
    status,
    shouldRecalibrate,
    unreliableDuration,
    dismissSuggestion,
    reset,
  }
}
