import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRefSync } from './useRefSync'
import { usePrevious } from './usePrevious'
import { calculateWpmFromReading } from '../utils/wpmCalculations'
import { calculateProgressPercentage } from '../utils/progressCalculation'
import {
  normalizeGazeX,
  clampNormalized,
  calculateDynamicThreshold,
} from '../utils/gazeNormalization'
import { pruneByTime } from '../utils/arrayUtils'
import {
  END_OF_LINE_THRESHOLD,
  END_ZONE_EARLY_DETECTION,
  MIN_READING_TIME_FOR_WPM,
  CHUNK_IGNORE_PERIOD_MS,
  RETURN_SWEEP_THRESHOLD,
  RETURN_SWEEP_VELOCITY_THRESHOLD,
  VELOCITY_TRANSITION_THRESHOLD,
  VELOCITY_DIRECTION_THRESHOLD,
  VELOCITY_SAMPLE_COUNT,
  VELOCITY_WINDOW_MS,
  MIN_ADVANCE_DEBOUNCE_MS,
  MIN_TEXT_FILL_RATIO,
} from '../constants/adaptive'

/**
 * Throttle interval for horizontal progress UI updates (ms).
 * 50ms (~20fps) provides responsive visual feedback while preventing re-render cascade.
 */
const PROGRESS_UPDATE_MS = 50

type UseHorizontalReaderOptions = {
  text: string
  gazeX: number | null
  isGazeReliable: boolean
  containerLeft: number
  containerWidth: number
  disabled?: boolean
  totalChunks: number
  chunkWordCounts?: number[]
  /**
   * Ratio of actual text width to container width (0-1).
   * Used to calculate dynamic end-zone thresholds for short/centered text.
   * Default: 1.0 (text fills entire container width)
   */
  textFillRatio?: number
  initialWordIndex?: number
}

type UseHorizontalReaderReturn = {
  currentChunk: number
  horizontalProgress: number
  isInEndZone: boolean
  isSweepDetected: boolean
  isComplete: boolean
  progress: number
  calculatedWpm: number
  restart: () => void
  goBack: () => void
  goForward: () => void
  /** Dynamic end-zone threshold adjusted for text fill ratio (0-1) */
  effectiveEndThreshold: number
  wordsRead: number
}

/**
 * Hook for single-line horizontal reading with gaze tracking.
 *
 * Uses velocity transition detection: advances to next chunk when
 * gaze reaches the end zone (right side) and STARTS moving left
 * (detects the transition from stationary/rightward to leftward).
 * This provides immediate response as the return sweep begins.
 */
export function useHorizontalReader({
  text,
  gazeX,
  isGazeReliable,
  containerLeft,
  containerWidth,
  disabled = false,
  totalChunks,
  chunkWordCounts,
  textFillRatio = 1.0,
  initialWordIndex = 0,
}: UseHorizontalReaderOptions): UseHorizontalReaderReturn {
  const [currentChunk, setCurrentChunk] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [horizontalProgress, setHorizontalProgress] = useState(0)
  const [calculatedWpm, setCalculatedWpm] = useState(0)
  const [isSweepDetected, setIsSweepDetected] = useState(false)

  const chunkStartTimeRef = useRef<number>(0)
  const readingStartTimeRef = useRef<number | null>(null)
  const reachedEndZoneRef = useRef(false)
  const gazePositionHistoryRef = useRef<Array<{ x: number; time: number }>>([])
  const lastAdvanceTimeRef = useRef<number>(0)
  const previousHorizontalVelocityRef = useRef<number>(0)
  const lastProgressUpdateRef = useRef<number>(0)

  /**
   * Synchronous completion guard to prevent race conditions.
   * While isComplete state is async (React batches state updates), this ref
   * provides an immediate guard within the same render cycle to prevent
   * multiple completion triggers from rapid gaze updates.
   */
  const completionTriggeredRef = useRef(false)

  const containerLeftRef = useRefSync(containerLeft)
  const containerWidthRef = useRefSync(containerWidth)
  const totalChunksRef = useRefSync(totalChunks)

  const initialPositionAppliedRef = useRef(false)

  useEffect(() => {
    if (
      !initialPositionAppliedRef.current &&
      initialWordIndex > 0 &&
      chunkWordCounts &&
      chunkWordCounts.length > 0
    ) {
      let cumulative = 0
      let targetChunk = 0
      for (let i = 0; i < chunkWordCounts.length; i++) {
        cumulative += chunkWordCounts[i]
        if (initialWordIndex < cumulative) {
          targetChunk = i
          break
        }
        targetChunk = i
      }

      initialPositionAppliedRef.current = true

      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing initial position from props
      setCurrentChunk(targetChunk)
      if (totalChunks > 0 && targetChunk >= totalChunks - 1) {
        setIsComplete(true)
        completionTriggeredRef.current = true
      }
    }
  }, [initialWordIndex, chunkWordCounts, totalChunks])

  const wordsRead = useMemo(() => {
    if (currentChunk === 0) return 0
    if (chunkWordCounts && chunkWordCounts.length > 0) {
      let total = 0
      for (let i = 0; i < currentChunk && i < chunkWordCounts.length; i++) {
        total += chunkWordCounts[i]
      }
      return total
    }
    return 0
  }, [currentChunk, chunkWordCounts])

  const progress = useMemo(
    () => calculateProgressPercentage(currentChunk, totalChunks),
    [currentChunk, totalChunks]
  )

  /**
   * Dynamic end-zone thresholds adjusted for text fill ratio.
   * Uses calculateDynamicThreshold utility for consistent calculation.
   *
   * For full-width text (ratio=1), thresholds match the original static values.
   * For short centered text, thresholds shift toward center proportionally.
   */
  const dynamicThresholds = useMemo(() => {
    const ratio = Math.max(MIN_TEXT_FILL_RATIO, Math.min(1, textFillRatio))
    return {
      endOfLine: calculateDynamicThreshold(ratio, END_OF_LINE_THRESHOLD),
      earlyDetection: calculateDynamicThreshold(
        ratio,
        END_ZONE_EARLY_DETECTION
      ),
      // Return sweep threshold stays fixed at container center.
      // This is intentional: it's a FALLBACK for when velocity detection fails,
      // and gaze reaching center means they've definitely started a return sweep.
      returnSweep: RETURN_SWEEP_THRESHOLD,
    }
  }, [textFillRatio])

  // Start reading timer when gaze tracking becomes active
  useEffect(() => {
    if (!disabled && isGazeReliable && readingStartTimeRef.current === null) {
      readingStartTimeRef.current = Date.now()
    }
  }, [disabled, isGazeReliable])

  // Calculate WPM from actual reading speed
  useEffect(() => {
    if (readingStartTimeRef.current === null || wordsRead === 0) {
      return
    }
    const elapsedMs = Date.now() - readingStartTimeRef.current
    if (elapsedMs < MIN_READING_TIME_FOR_WPM * 1000) {
      return
    }
    setCalculatedWpm(calculateWpmFromReading(wordsRead, elapsedMs))
  }, [wordsRead])

  // Reset tracking state when chunk changes
  useEffect(() => {
    chunkStartTimeRef.current = Date.now()
    reachedEndZoneRef.current = false
    gazePositionHistoryRef.current = []
    previousHorizontalVelocityRef.current = 0
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset derived state on chunk change
    setIsSweepDetected(false)
  }, [currentChunk])

  // Ensure sweep indicator is cleared when reading completes
  useEffect(() => {
    if (isComplete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear UI indicator on completion
      setIsSweepDetected(false)
    }
  }, [isComplete])

  // Main gaze processing with velocity transition detection
  useEffect(() => {
    if (disabled || isComplete || completionTriggeredRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear indicator
      setIsSweepDetected(false)
      return
    }

    const width = containerWidthRef.current
    const left = containerLeftRef.current
    const chunks = totalChunksRef.current

    if (width <= 0) return

    if (!isGazeReliable || gazeX === null) {
      setHorizontalProgress(0)
      setIsSweepDetected(false)
      gazePositionHistoryRef.current = []
      previousHorizontalVelocityRef.current = 0
      return
    }

    const now = Date.now()
    const timeSinceChunkStart = now - chunkStartTimeRef.current
    const normalizedX = normalizeGazeX(gazeX, left, width)
    const clampedProgress = clampNormalized(normalizedX)

    // Throttle progress UI updates to prevent re-render cascade
    if (now - lastProgressUpdateRef.current >= PROGRESS_UPDATE_MS) {
      lastProgressUpdateRef.current = now
      setHorizontalProgress(clampedProgress)
    }

    // Track recent positions for velocity calculation
    const history = gazePositionHistoryRef.current
    history.push({ x: normalizedX, time: now })
    pruneByTime(history, now - VELOCITY_WINDOW_MS, (item) => item.time)

    // Ignore gaze for a brief period after chunk change
    if (timeSinceChunkStart <= CHUNK_IGNORE_PERIOD_MS) {
      return
    }

    // Track when gaze reaches the end zone (using dynamic threshold)
    if (normalizedX >= dynamicThresholds.endOfLine) {
      reachedEndZoneRef.current = true
    }

    /**
     * Return Sweep Detection Algorithm
     * ---------------------------------
     * We use velocity TRANSITION detection rather than just position or velocity:
     *
     * Why transition detection?
     * - Detecting just "gaze is moving left" can trigger mid-read as eyes saccade
     * - Detecting just "gaze is at start position" is too late (sweep already done)
     * - Detecting the TRANSITION (stationary/right -> left) catches the exact moment
     *   the return sweep begins, providing immediate response
     *
     * Three detection methods (priority order):
     * 1. PRIMARY: Velocity transition while near end zone
     *    - Most responsive, triggers as sweep begins
     *    - Requires: was stationary/rightward AND is now leftward AND still in end zone
     *
     * 2. SECONDARY: Strong leftward velocity anywhere
     *    - Catches sweeps that start after gaze leaves end zone
     *    - Higher velocity threshold to avoid false positives from saccades
     *
     * 3. FALLBACK: Position-based when velocity unreliable
     *    - Used when insufficient samples for velocity calculation
     *    - Less responsive but ensures we don't get stuck
     */
    if (reachedEndZoneRef.current) {
      const positions = gazePositionHistoryRef.current
      let shouldAdvance = false

      // Calculate current velocity (normalized units per ms)
      // Negative = leftward, positive = rightward
      if (positions.length >= VELOCITY_SAMPLE_COUNT) {
        const oldest = positions[0]
        const newest = positions[positions.length - 1]
        const deltaX = newest.x - oldest.x
        const deltaT = newest.time - oldest.time

        if (deltaT > 0) {
          const velocity = deltaX / deltaT

          // Classify previous and current gaze movement direction
          const wasStationary =
            Math.abs(previousHorizontalVelocityRef.current) <
            VELOCITY_DIRECTION_THRESHOLD
          const wasRightward =
            previousHorizontalVelocityRef.current > VELOCITY_DIRECTION_THRESHOLD
          const isNowLeftward = velocity < -VELOCITY_TRANSITION_THRESHOLD

          // PRIMARY: Velocity transition while still near end zone
          // This catches the moment the return sweep begins
          if (
            (wasStationary || wasRightward) &&
            isNowLeftward &&
            normalizedX >= dynamicThresholds.earlyDetection
          ) {
            shouldAdvance = true
          }
          // SECONDARY: Significant leftward velocity anywhere after reaching end zone
          // Higher threshold to avoid false positives from normal reading saccades
          else if (velocity < -RETURN_SWEEP_VELOCITY_THRESHOLD) {
            shouldAdvance = true
          }

          previousHorizontalVelocityRef.current = velocity
        }
      }

      // FALLBACK: Position-based detection when velocity data insufficient
      // Less responsive but prevents getting stuck when tracking is noisy
      if (
        !shouldAdvance &&
        positions.length < VELOCITY_SAMPLE_COUNT &&
        normalizedX < dynamicThresholds.returnSweep
      ) {
        shouldAdvance = true
      }

      const shouldTriggerAdvance =
        shouldAdvance &&
        now - lastAdvanceTimeRef.current > MIN_ADVANCE_DEBOUNCE_MS

      // Guard: Only allow when chunks are calculated (>1)
      if (shouldTriggerAdvance && chunks > 1) {
        lastAdvanceTimeRef.current = now
        if (currentChunk < chunks - 1) {
          setIsSweepDetected(true)
          setCurrentChunk((prev) => prev + 1)
        } else {
          completionTriggeredRef.current = true
          setIsSweepDetected(false)
          setIsComplete(true)
          return
        }
      } else if (!completionTriggeredRef.current) {
        setIsSweepDetected(shouldAdvance)
      }
    }
  }, [
    gazeX,
    isGazeReliable,
    disabled,
    isComplete,
    currentChunk,
    containerLeftRef,
    containerWidthRef,
    totalChunksRef,
    dynamicThresholds,
  ])

  /**
   * Reset gaze tracking state to prevent stale data from triggering false sweeps.
   * Called when manually navigating chunks or restarting.
   */
  const resetTrackingState = useCallback(() => {
    reachedEndZoneRef.current = false
    gazePositionHistoryRef.current = []
    previousHorizontalVelocityRef.current = 0
    setIsSweepDetected(false)
  }, [])

  const restart = useCallback(() => {
    setCurrentChunk(0)
    setIsComplete(false)
    setHorizontalProgress(0)
    setCalculatedWpm(0)
    resetTrackingState()
    chunkStartTimeRef.current = Date.now()
    readingStartTimeRef.current = null
    lastAdvanceTimeRef.current = 0
    completionTriggeredRef.current = false
    initialPositionAppliedRef.current = false
  }, [resetTrackingState])

  const goBack = useCallback(() => {
    resetTrackingState()
    setCurrentChunk((prev) => Math.max(0, prev - 1))
    setIsComplete(false)
    completionTriggeredRef.current = false
  }, [resetTrackingState])

  const goForward = useCallback(() => {
    const chunks = totalChunksRef.current
    if (chunks <= 1) return

    resetTrackingState()
    setCurrentChunk((prev) => {
      if (prev >= chunks - 1) {
        completionTriggeredRef.current = true
        setIsComplete(true)
        return prev
      }
      return prev + 1
    })
  }, [totalChunksRef, resetTrackingState])

  // Reset when text changes
  const prevText = usePrevious(text)
  useEffect(() => {
    if (prevText !== undefined && prevText !== text) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state with text prop
      restart()
    }
  }, [text, prevText, restart])

  const isInEndZone =
    isGazeReliable && horizontalProgress >= dynamicThresholds.endOfLine

  return {
    currentChunk,
    horizontalProgress,
    isInEndZone,
    isSweepDetected,
    isComplete,
    progress,
    calculatedWpm,
    restart,
    goBack,
    goForward,
    effectiveEndThreshold: dynamicThresholds.endOfLine,
    wordsRead,
  }
}
