import { Outlet } from 'react-router-dom'
import { useSyncReadingMode } from '../hooks/useSyncReadingMode'

/**
 * Locks `preferences.mode` to `'rsvp'` while mounted so the OptionsBar
 * and persisted mode never drift from the active route.
 */
export function RsvpLayout() {
  useSyncReadingMode('rsvp')
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Outlet />
    </div>
  )
}
