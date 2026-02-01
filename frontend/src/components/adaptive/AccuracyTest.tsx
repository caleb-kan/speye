import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { GazeData } from '../../types/webgazer'
import type { AccuracyTestState } from '../../types/adaptive'
import {
  ACCURACY_SAMPLE_COUNT,
  ACCURACY_MAX_WAIT_MS,
  MIN_ACCURACY_SAMPLES,
  CALIBRATION_ACCURACY_THRESHOLD,
  ACCURACY_COUNTDOWN_SECONDS,
  CALCULATION_DISPLAY_DELAY_MS,
  RESULT_DISPLAY_DELAY_MS,
  ACCURACY_INSTRUCTIONS_OFFSET_PX,
  ACCURACY_PROGRESS_TRANSITION_MS,
} from '../../constants/calibration'
import { Z_INDEX } from '../../constants/ui'
import { calculatePrecision } from '../../utils/gazeAnalysis'
import { isAccuracySufficient } from '../../utils/calibrationStorage'
import { Spinner } from '../ui/Spinner'
import { getViewportCenter } from '../../utils/gazeNormalization'

/** UI update interval for progress display (ms) - matches other throttle settings for consistency */
const UI_UPDATE_INTERVAL_MS = 50

type AccuracyTestProps = {
  /** Called when accuracy test completes */
  onComplete: (accuracy: number, passed: boolean) => void
  /** Gaze data from WebGazer */
  gazeData: GazeData | null
  /** Target position for accuracy test (defaults to viewport center) */
  targetPosition?: { x: number; y: number }
}

export function AccuracyTest({
  onComplete,
  gazeData,
  targetPosition,
}: AccuracyTestProps) {
  // Default to viewport center if no target position provided
  const viewportCenter = useMemo(() => getViewportCenter(), [])
  const targetX = targetPosition?.x ?? viewportCenter.x
  const targetY = targetPosition?.y ?? viewportCenter.y
  const [state, setState] = useState<AccuracyTestState>('waiting')
  const [countdown, setCountdown] = useState(ACCURACY_COUNTDOWN_SECONDS)
  const [progress, setProgress] = useState(0)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [sampleCount, setSampleCount] = useState(0)

  const samplesRef = useRef<GazeData[]>([])
  const onCompleteRef = useRef(onComplete)
  const lastUIUpdateRef = useRef(0)
  const stateRef = useRef(state)

  // Keep refs fresh to avoid stale closures
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Countdown before starting collection
  useEffect(() => {
    if (state !== 'waiting') return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setState('collecting')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [state])

  // Collect gaze sample - uses refs to avoid state updates on every sample
  const collectSample = useCallback((data: GazeData) => {
    if (stateRef.current !== 'collecting') return

    // Add sample to ref (no state update)
    samplesRef.current.push(data)
    const currentCount = samplesRef.current.length

    // Throttle UI updates to reduce re-renders
    const now = Date.now()
    if (now - lastUIUpdateRef.current >= UI_UPDATE_INTERVAL_MS) {
      lastUIUpdateRef.current = now
      setSampleCount(currentCount)
      // Progress based on sample count (since that's what determines completion)
      setProgress(Math.min(100, (currentCount / ACCURACY_SAMPLE_COUNT) * 100))
    }

    // Check if collection is complete
    if (currentCount >= ACCURACY_SAMPLE_COUNT) {
      // Final UI update
      setSampleCount(currentCount)
      setProgress(100)
      setState('calculating')
    }
  }, [])

  // Process incoming gaze data
  useEffect(() => {
    if (state !== 'collecting' || !gazeData) return
    collectSample(gazeData)
  }, [state, gazeData, collectSample])

  // Timeout protection: Force calculation if gaze data stops coming
  useEffect(() => {
    if (state !== 'collecting') return

    const timeout = setTimeout(() => {
      const currentCount = samplesRef.current.length
      if (currentCount >= MIN_ACCURACY_SAMPLES) {
        // Set final progress based on samples collected
        setSampleCount(currentCount)
        setProgress(Math.min(100, (currentCount / ACCURACY_SAMPLE_COUNT) * 100))
        setState('calculating')
      } else {
        // Insufficient samples - show helpful message instead of 0% accuracy
        setState('insufficient-samples')
        setTimeout(() => {
          onCompleteRef.current(0, false)
        }, RESULT_DISPLAY_DELAY_MS)
      }
    }, ACCURACY_MAX_WAIT_MS)

    return () => clearTimeout(timeout)
  }, [state])

  // Calculate accuracy when collection is complete
  useEffect(() => {
    if (state !== 'calculating') return

    const timer = setTimeout(() => {
      const calculatedAccuracy = calculatePrecision(
        samplesRef.current,
        targetX,
        targetY
      )
      setAccuracy(calculatedAccuracy)
      setState('complete')

      setTimeout(() => {
        onCompleteRef.current(
          calculatedAccuracy,
          isAccuracySufficient(calculatedAccuracy)
        )
      }, RESULT_DISPLAY_DELAY_MS)
    }, CALCULATION_DISPLAY_DELAY_MS)

    return () => clearTimeout(timer)
  }, [state, targetX, targetY])

  return (
    <div className="fixed inset-0 bg-bg" style={{ zIndex: Z_INDEX.OVERLAY }}>
      {/* Target point to stare at - positioned at target location */}
      <div
        className={`
          absolute w-6 h-6 rounded-full bg-primary
          transform -translate-x-1/2 -translate-y-1/2
          ${state === 'collecting' ? 'animate-pulse' : ''}
        `}
        style={{
          left: targetX,
          top: targetY,
        }}
        role="img"
        aria-label="Focus your gaze on this target point"
      />

      {/* Instructions positioned below the target */}
      <div
        className="absolute text-center max-w-md transform -translate-x-1/2"
        style={{
          left: targetX,
          top: targetY + ACCURACY_INSTRUCTIONS_OFFSET_PX,
        }}
      >
        {state === 'waiting' && (
          <>
            <h2 className="text-2xl font-semibold text-text mb-4">
              Measuring Accuracy
            </h2>
            <p className="text-text-secondary mb-4">
              Keep your head still and stare at the dot above.
            </p>
            <p className="text-4xl font-bold text-primary">{countdown}</p>
          </>
        )}

        {state === 'collecting' && (
          <>
            <h2 className="text-2xl font-semibold text-text mb-4">
              Keep staring at the dot...
            </h2>
            <div className="w-64 h-2 bg-bg-secondary rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${progress}%`,
                  transition: `all ${ACCURACY_PROGRESS_TRANSITION_MS}ms`,
                }}
              />
            </div>
            <p className="text-text-secondary mt-2">
              Collecting samples: {sampleCount}/{ACCURACY_SAMPLE_COUNT}
            </p>
          </>
        )}

        {state === 'calculating' && (
          <>
            <h2 className="text-2xl font-semibold text-text mb-4">
              Calculating accuracy...
            </h2>
            <Spinner size="md" className="mx-auto" />
          </>
        )}

        {state === 'insufficient-samples' && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-error">
              Insufficient Tracking Data
            </h2>
            <p className="text-text-secondary mb-4">
              Unable to collect enough gaze samples.
            </p>
            <p className="text-text-secondary text-sm">
              Please ensure good lighting and that your face is clearly visible
              to the camera.
            </p>
          </>
        )}

        {state === 'complete' && accuracy !== null && (
          <>
            <h2
              className={`text-2xl font-semibold mb-4 ${
                isAccuracySufficient(accuracy) ? 'text-success' : 'text-error'
              }`}
            >
              {isAccuracySufficient(accuracy)
                ? 'Calibration Successful!'
                : 'Calibration Accuracy Too Low'}
            </h2>
            <p className="text-5xl font-bold text-text mb-4">{accuracy}%</p>
            <p className="text-text-secondary">
              {isAccuracySufficient(accuracy)
                ? 'Your eye tracking is ready to use.'
                : `Accuracy must be at least ${CALIBRATION_ACCURACY_THRESHOLD}% for reliable tracking.`}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
