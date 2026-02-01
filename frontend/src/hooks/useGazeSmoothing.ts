import { useState, useCallback, useRef } from 'react'
import type { GazeData } from '../types/webgazer'
import type { SmoothedGaze, GazeSample } from '../types/adaptive'
import { pruneByTime } from '../utils/arrayUtils'
import {
  GAZE_SMOOTHING_WINDOW_MS,
  GAZE_MIN_SAMPLES,
  GAZE_MIN_FILTERED_SAMPLES_FACTOR,
  CONFIDENCE_THRESHOLD_ON,
  CONFIDENCE_THRESHOLD_OFF,
  MAX_GAZE_VELOCITY,
  MAX_GAP_BEFORE_RESET_MS,
  MIN_FRAME_INTERVAL_MS,
  VELOCITY_GAP_THRESHOLD_MS,
  VELOCITY_GAP_SCALE_FACTOR,
} from '../constants/adaptive'
import {
  filterOutliersWithStats,
  weightedAverage,
  calculateGazeConfidence,
} from '../utils/gazeAnalysis'

/**
 * State update interval for smoothed gaze output (ms).
 * 50ms (~20fps) provides responsive visual feedback while preventing
 * re-render cascades.
 */
const SMOOTHED_STATE_UPDATE_MS = 50

type UseGazeSmoothingOptions = {
  windowMs?: number
  minSamples?: number
}

type UseGazeSmoothingReturn = {
  smoothedGaze: SmoothedGaze | null
  confidence: number
  isReliable: boolean
  addSample: (data: GazeData) => void
  clearSamples: () => void
}

/**
 * Applies temporal smoothing to raw gaze data using a rolling window
 * with velocity-based outlier rejection and weighted averaging.
 */
export function useGazeSmoothing({
  windowMs = GAZE_SMOOTHING_WINDOW_MS,
  minSamples = GAZE_MIN_SAMPLES,
}: UseGazeSmoothingOptions = {}): UseGazeSmoothingReturn {
  const [smoothedGaze, setSmoothedGaze] = useState<SmoothedGaze | null>(null)
  const [isReliable, setIsReliable] = useState(false)

  const confidence = smoothedGaze?.confidence ?? 0

  const samplesRef = useRef<GazeSample[]>([])
  const lastStateUpdateRef = useRef(0)
  const lastSampleTimeRef = useRef<number | null>(null)

  const processSmoothing = useCallback(() => {
    const now = Date.now()
    const samples = samplesRef.current
    pruneByTime(samples, now - windowMs, (s) => s.timestamp)

    // Throttle state updates to ~20fps to prevent re-render cascade
    if (now - lastStateUpdateRef.current < SMOOTHED_STATE_UPDATE_MS) {
      return
    }
    lastStateUpdateRef.current = now

    const sampleCount = samples.length

    if (sampleCount < minSamples) {
      setSmoothedGaze(null)
      setIsReliable(false)
      return
    }

    const xValues = new Array<number>(sampleCount)
    const yValues = new Array<number>(sampleCount)
    for (let i = 0; i < sampleCount; i++) {
      xValues[i] = samples[i].x
      yValues[i] = samples[i].y
    }

    const xResult = filterOutliersWithStats(xValues)
    const yResult = filterOutliersWithStats(yValues)

    // Use Math.ceil to ensure integer comparison with array length
    const minFiltered = Math.ceil(minSamples * GAZE_MIN_FILTERED_SAMPLES_FACTOR)
    if (
      xResult.filtered.length < minFiltered ||
      yResult.filtered.length < minFiltered
    ) {
      setSmoothedGaze(null)
      setIsReliable(false)
      return
    }

    const smoothedX = weightedAverage(xResult.filtered)
    const smoothedY = weightedAverage(yResult.filtered)
    const gazeConfidence = calculateGazeConfidence(
      xResult.filtered,
      yResult.filtered,
      xResult.stats,
      yResult.stats
    )

    // Hysteresis for reliability state transitions
    // Uses different thresholds for turning ON vs OFF to prevent rapid oscillation:
    // - Requires higher confidence (0.35) to become reliable (conservative activation)
    // - Requires lower confidence (0.25) to become unreliable (forgiving deactivation)
    // This creates a "dead zone" that absorbs noise in borderline tracking conditions
    setIsReliable((current) => {
      if (current) {
        return gazeConfidence >= CONFIDENCE_THRESHOLD_OFF
      }
      return gazeConfidence >= CONFIDENCE_THRESHOLD_ON
    })

    setSmoothedGaze({
      x: smoothedX,
      y: smoothedY,
      confidence: gazeConfidence,
      timestamp: now,
    })
  }, [windowMs, minSamples])

  const addSample = useCallback(
    (data: GazeData) => {
      const now = Date.now()
      const samples = samplesRef.current
      const lastSampleTime = lastSampleTimeRef.current

      // Reset buffer on tracking loss (gap > 500ms indicates camera occlusion,
      // face turning away, or WebGazer losing the face - stale samples are invalid)
      if (
        lastSampleTime !== null &&
        now - lastSampleTime > MAX_GAP_BEFORE_RESET_MS
      ) {
        samples.length = 0
        setSmoothedGaze(null)
        setIsReliable(false)
      }
      lastSampleTimeRef.current = now

      // Velocity-based outlier rejection: filters physically impossible eye movements
      // Human saccades max ~700 deg/s; exceeding MAX_GAZE_VELOCITY indicates tracking
      // glitch (face mesh jump, lighting change) rather than real eye movement
      if (samples.length > 0) {
        const lastSample = samples[samples.length - 1]
        const deltaT = now - lastSample.timestamp

        // Skip samples arriving faster than 5ms (duplicate frames)
        if (deltaT < MIN_FRAME_INTERVAL_MS) return

        const deltaX = Math.abs(data.x - lastSample.x)
        const deltaY = Math.abs(data.y - lastSample.y)
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const velocity = distance / deltaT

        // Adaptive threshold: allow higher velocity after long gaps (user may have
        // legitimately moved) to prevent false rejections on tracking resume.
        // Formula scales linearly: at 100ms gap, maxVelocity = 12; at 300ms, it's 24.
        let maxVelocity = MAX_GAZE_VELOCITY
        if (deltaT > VELOCITY_GAP_THRESHOLD_MS) {
          maxVelocity =
            MAX_GAZE_VELOCITY *
            (1 +
              (deltaT - VELOCITY_GAP_THRESHOLD_MS) / VELOCITY_GAP_SCALE_FACTOR)
        }

        if (velocity > maxVelocity) return
      }

      samplesRef.current.push({ x: data.x, y: data.y, timestamp: now })
      processSmoothing()
    },
    [processSmoothing]
  )

  const clearSamples = useCallback(() => {
    samplesRef.current = []
    lastSampleTimeRef.current = null
    setSmoothedGaze(null)
    setIsReliable(false)
  }, [])

  return {
    smoothedGaze,
    confidence,
    isReliable,
    addSample,
    clearSamples,
  }
}
