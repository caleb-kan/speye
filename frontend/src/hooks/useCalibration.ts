import { useContext } from 'react'
import {
  CalibrationContext,
  type CalibrationContextType,
} from '../context/calibrationContext'

/**
 * Hook to access calibration state and actions
 * Must be used within a CalibrationProvider
 */
export function useCalibration(): CalibrationContextType {
  const context = useContext(CalibrationContext)

  if (!context) {
    throw new Error('useCalibration must be used within a CalibrationProvider')
  }

  return context
}
