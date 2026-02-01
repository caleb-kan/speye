import {
  GAZE_MIN_SAMPLES,
  OUTLIER_STDDEV_THRESHOLD,
  GAZE_CONFIDENCE_SENSITIVITY,
} from '../constants/adaptive'
import { ACCURACY_MAX_DISTANCE_FACTOR } from '../constants/calibration'
import type { GazeData } from '../types/webgazer'

/** @internal Statistics for gaze data analysis */
type GazeStats = { mean: number; stdDev: number }

function calculateStats(values: number[]): GazeStats {
  if (values.length === 0) return { mean: 0, stdDev: 0 }

  const n = values.length
  let sum = 0
  for (let i = 0; i < n; i++) sum += values[i]
  const mean = sum / n

  let sqDiffSum = 0
  for (let i = 0; i < n; i++) sqDiffSum += (values[i] - mean) ** 2
  const stdDev = Math.sqrt(sqDiffSum / n)

  return { mean, stdDev }
}

export function filterOutliersWithStats(values: number[]): {
  filtered: number[]
  stats: GazeStats
} {
  if (values.length < GAZE_MIN_SAMPLES) {
    return { filtered: values, stats: calculateStats(values) }
  }

  const stats = calculateStats(values)
  const threshold = stats.stdDev * OUTLIER_STDDEV_THRESHOLD

  const filtered: number[] = []
  for (let i = 0; i < values.length; i++) {
    if (Math.abs(values[i] - stats.mean) <= threshold) {
      filtered.push(values[i])
    }
  }

  return { filtered, stats }
}

/**
 * Weighted average with recent values weighted higher (linear weighting).
 * More recent samples (later in array) get higher weights because they
 * better represent current gaze position. This reduces lag while still
 * smoothing noise from older samples.
 */
export function weightedAverage(values: number[]): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]

  let weightedSum = 0
  let totalWeight = 0

  // Linear weighting: index 0 gets weight 1, index n-1 gets weight n
  for (let i = 0; i < values.length; i++) {
    const weight = i + 1
    weightedSum += values[i] * weight
    totalWeight += weight
  }

  return weightedSum / totalWeight
}

/** Calculate confidence based on gaze sample consistency. */
export function calculateGazeConfidence(
  xValues: number[],
  yValues: number[],
  providedXStats?: GazeStats,
  providedYStats?: GazeStats
): number {
  if (xValues.length < GAZE_MIN_SAMPLES || yValues.length < GAZE_MIN_SAMPLES) {
    return 0
  }

  const xStats = providedXStats ?? calculateStats(xValues)
  const yStats = providedYStats ?? calculateStats(yValues)

  const xNormalized = xStats.stdDev / window.innerWidth
  const yNormalized = yStats.stdDev / window.innerHeight

  const xConf = Math.exp(-GAZE_CONFIDENCE_SENSITIVITY * xNormalized)
  const yConf = Math.exp(-GAZE_CONFIDENCE_SENSITIVITY * yNormalized)

  return (xConf + yConf) / 2
}

/** Calculate precision from collected gaze samples using distance-based scoring. */
export function calculatePrecision(
  samples: GazeData[],
  targetX: number,
  targetY: number
): number {
  if (samples.length === 0) return 0

  const maxDistance = window.innerHeight * ACCURACY_MAX_DISTANCE_FACTOR
  let totalPrecision = 0

  for (const sample of samples) {
    const distance = Math.sqrt(
      (targetX - sample.x) ** 2 + (targetY - sample.y) ** 2
    )
    const precision =
      distance <= maxDistance ? 100 - (distance / maxDistance) * 100 : 0
    totalPrecision += precision
  }

  return Math.round(totalPrecision / samples.length)
}
