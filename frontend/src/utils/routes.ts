import type { Mode } from '../types/reading'
import { isMobileDevice } from './isMobileDevice'
import { loadStoredMode } from './readingPreferencesStorage'

/** All app route paths */
export const ROUTES = {
  HOME: '/home',
  ADAPTIVE: '/adaptive',
  RSVP: '/rsvp',
  PVP: '/pvp',
  LIBRARY: '/library',
  ACTIVITY: '/activity',
  ADMIN: '/admin',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  LOGIN: '/login',
  COMPLETE_PROFILE: '/complete-profile',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  LICENSE: '/license',
} as const

/** Route for each reading mode */
export const MODE_ROUTES: Record<Mode, string> = {
  standard: ROUTES.HOME,
  adaptive: ROUTES.ADAPTIVE,
  rsvp: ROUTES.RSVP,
}

/**
 * Resolves the default reading route given the device context and known
 * mode. Mobile always routes to RSVP; desktop routes to the mode-specific
 * page, falling back to /home when the mode is unknown.
 *
 * Pure function — accepts inputs rather than reading them, so it can be
 * reused from both the reactive hook and non-reactive callers.
 */
export function resolveDefaultReadingRoute(
  mode: Mode | null,
  isMobile: boolean
): string {
  if (isMobile) return ROUTES.RSVP
  return mode ? MODE_ROUTES[mode] : ROUTES.HOME
}

/**
 * Returns the default reading route based on device type and the user's
 * last-used mode persisted in localStorage. Mobile devices always get
 * RSVP; desktop returns to the last-used mode.
 *
 * Use this for non-reactive contexts (callbacks, redirects).
 * For reactive use inside components, use the useDefaultReadingRoute hook.
 */
export function getDefaultReadingRoute(): string {
  return resolveDefaultReadingRoute(loadStoredMode(), isMobileDevice())
}
