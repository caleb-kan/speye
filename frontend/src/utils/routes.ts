import type { Mode } from '../types/reading'
import { isMobileDevice } from './isMobileDevice'

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
 * Returns the default reading route based on device type.
 * Mobile devices always get RSVP mode; desktop gets standard (home).
 *
 * Use this for non-reactive contexts (callbacks, redirects).
 * For reactive use inside components, use the useDefaultReadingRoute hook.
 */
export function getDefaultReadingRoute(): string {
  return isMobileDevice() ? ROUTES.RSVP : ROUTES.HOME
}
