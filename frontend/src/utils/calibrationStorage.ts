import { STORAGE_KEYS } from '../constants/storage'
import {
  CALIBRATION_EXPIRY_MS,
  CALIBRATION_ACCURACY_THRESHOLD,
} from '../constants/calibration'
import type { CalibrationState } from '../types/adaptive'

const defaultCalibrationState: CalibrationState = {
  isCalibrated: false,
  accuracy: null,
  lastCalibrationTime: null,
  calibrationAttempts: 0,
}

export function loadCalibrationState(): CalibrationState {
  try {
    let stored = localStorage.getItem(STORAGE_KEYS.ADAPTIVE_CALIBRATION)
    if (!stored) {
      stored = sessionStorage.getItem(STORAGE_KEYS.ADAPTIVE_CALIBRATION)
    }
    if (!stored) return defaultCalibrationState

    const parsed = JSON.parse(stored) as CalibrationState
    return { ...defaultCalibrationState, ...parsed }
  } catch {
    return defaultCalibrationState
  }
}

/**
 * Result of a save operation.
 * - success: Whether the save succeeded (in either storage)
 * - fallback: Whether sessionStorage was used as fallback (for debugging
 *   scenarios where localStorage is unavailable, e.g., private browsing)
 */
type SaveResult = {
  success: boolean
  fallback: boolean
}

export function saveCalibrationState(state: CalibrationState): SaveResult {
  const data = JSON.stringify(state)

  try {
    localStorage.setItem(STORAGE_KEYS.ADAPTIVE_CALIBRATION, data)
    return { success: true, fallback: false }
  } catch {
    try {
      sessionStorage.setItem(STORAGE_KEYS.ADAPTIVE_CALIBRATION, data)
      return { success: true, fallback: true }
    } catch {
      return { success: false, fallback: false }
    }
  }
}

export function isCalibrationExpired(
  lastCalibrationTime: number | null,
  maxAgeMs: number = CALIBRATION_EXPIRY_MS
): boolean {
  if (lastCalibrationTime === null) return true
  return Date.now() - lastCalibrationTime > maxAgeMs
}

export function markCalibrationFailed(): CalibrationState {
  const currentState = loadCalibrationState()
  const newState: CalibrationState = {
    ...currentState,
    isCalibrated: false,
    calibrationAttempts: currentState.calibrationAttempts + 1,
  }
  saveCalibrationState(newState)
  return newState
}

export function resetCalibrationState(): CalibrationState {
  const currentState = loadCalibrationState()
  const newState: CalibrationState = {
    ...defaultCalibrationState,
    calibrationAttempts: currentState.calibrationAttempts,
  }
  saveCalibrationState(newState)
  return newState
}

export function isAccuracySufficient(accuracy: number): boolean {
  return accuracy >= CALIBRATION_ACCURACY_THRESHOLD
}
