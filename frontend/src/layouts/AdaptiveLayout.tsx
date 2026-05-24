import { Outlet } from 'react-router-dom'
import { CalibrationProvider } from '../context/CalibrationProvider'
import { useSyncReadingMode } from '../hooks/useSyncReadingMode'

/**
 * Layout wrapper for adaptive reading mode pages
 *
 * Provides:
 * - CalibrationProvider context for calibration state
 * - Full-height layout for adaptive reading
 *
 * Locks `preferences.mode` to `'adaptive'` while mounted so the OptionsBar
 * and persisted mode never drift from the active route.
 */
export function AdaptiveLayout() {
  useSyncReadingMode('adaptive')
  return (
    <CalibrationProvider>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </CalibrationProvider>
  )
}
