import { useIsMobile } from './useIsMobile'
import { useReadingPreferences } from './useReadingPreferences'
import { resolveDefaultReadingRoute, type ReadingRoute } from '../utils/routes'

/**
 * Reactive hook that returns the default reading route.
 * Mobile → /rsvp; desktop → the user's last-used mode page.
 * Re-evaluates when the viewport crosses the mobile breakpoint or when
 * the mode preference changes.
 */
export function useDefaultReadingRoute(): ReadingRoute {
  const isMobile = useIsMobile()
  const { preferences } = useReadingPreferences()
  return resolveDefaultReadingRoute(preferences.mode, isMobile)
}
