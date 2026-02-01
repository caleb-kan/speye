import { useState, useCallback, useMemo, type ReactNode } from 'react'
import {
  CalibrationContext,
  type CalibrationContextType,
} from './calibrationContext'
import type { CalibrationState } from '../types/adaptive'
import {
  loadCalibrationState,
  saveCalibrationState,
  markCalibrationFailed,
  resetCalibrationState,
  isAccuracySufficient,
} from '../utils/calibrationStorage'

type CalibrationProviderProps = {
  children: ReactNode
}

export function CalibrationProvider({ children }: CalibrationProviderProps) {
  const [state, setState] = useState<CalibrationState>(loadCalibrationState)

  const resetCalibration = useCallback(() => {
    const newState = resetCalibrationState()
    setState(newState)
  }, [])

  const completeCalibration = useCallback(
    (accuracy: number) => {
      const passed = isAccuracySufficient(accuracy)

      // Build state directly to avoid redundant localStorage writes
      const newState: CalibrationState = {
        isCalibrated: passed,
        accuracy,
        lastCalibrationTime: Date.now(),
        calibrationAttempts: state.calibrationAttempts + 1,
      }

      saveCalibrationState(newState)
      setState(newState)
    },
    [state.calibrationAttempts]
  )

  const failCalibration = useCallback(() => {
    const newState = markCalibrationFailed()
    setState(newState)
  }, [])

  const value: CalibrationContextType = useMemo(
    () => ({
      state,
      resetCalibration,
      completeCalibration,
      failCalibration,
    }),
    [state, resetCalibration, completeCalibration, failCalibration]
  )

  return (
    <CalibrationContext.Provider value={value}>
      {children}
    </CalibrationContext.Provider>
  )
}
