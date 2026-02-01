import { Outlet } from 'react-router-dom'
import { CalibrationProvider } from '../context/CalibrationProvider'

/**
 * Layout wrapper for adaptive reading mode pages
 *
 * Provides:
 * - CalibrationProvider context for calibration state
 * - Full-height layout for adaptive reading
 */
export function AdaptiveLayout() {
  return (
    <CalibrationProvider>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </CalibrationProvider>
  )
}
