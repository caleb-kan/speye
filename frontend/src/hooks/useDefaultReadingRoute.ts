import { useIsMobile } from './useIsMobile'
import { ROUTES } from '../utils/routes'

/**
 * Reactive hook that returns the default reading route.
 * Mobile → /rsvp, Desktop → /home.
 * Re-evaluates when the viewport crosses the mobile breakpoint.
 */
export function useDefaultReadingRoute(): string {
  const isMobile = useIsMobile()
  return isMobile ? ROUTES.RSVP : ROUTES.HOME
}
