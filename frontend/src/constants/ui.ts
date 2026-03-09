export const SUCCESS_MESSAGE_DURATION_MS = 5000

/**
 * Z-index hierarchy for layered UI elements.
 * Same-level entries are mutually exclusive or non-overlapping.
 */
export const Z_INDEX = {
  NAVBAR: 50,
  OVERLAY: 50,
  NOTIFICATION_TOASTER: 60,
  CALIBRATION_OVERLAY: 60,
  CALIBRATION_CONTENT: 70,
  CALIBRATION_POINT: 80,
  QUIZ_OVERLAY: 999,
} as const

export const MIN_WINDOW_WIDTH = 1000
export const MIN_WINDOW_HEIGHT = 600
export const MODAL_BACKDROP_BLUR = 3
export const MODAL_BACKDROP_OPACITY = 0
export const WINDOW_SIZE_WARNING_MESSAGE =
  'Your screen size is too small to fully experience the content.'

export const EXPAND_OVERFLOW_DELAY_MS = 550
export const SESSION_ITEM_STAGGER_MS = 50
export const OVERLAY_EXIT_ANIMATION_MS = 500
export const SYNCED_BANNER_DISPLAY_MS = 2000
export const SYNCING_FALLBACK_TIMEOUT_MS = 5000
export const CUBIC_EASE_OUT_EXPONENT = 3
export const TOAST_AUTO_CLOSE_MS = 5000
export const TOAST_EXIT_ANIMATION_MS = 220
