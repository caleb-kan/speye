import { createContext } from 'react'
import type { CalibrationState } from '../types/adaptive'

export interface CalibrationContextType {
  /** Current calibration state from localStorage */
  state: CalibrationState
  /** Reset calibration (clear data and start over) */
  resetCalibration: () => void
  /** Mark calibration as complete with accuracy */
  completeCalibration: (accuracy: number) => void
  /** Mark calibration as failed */
  failCalibration: () => void
}

export const CalibrationContext = createContext<CalibrationContextType | null>(
  null
)
