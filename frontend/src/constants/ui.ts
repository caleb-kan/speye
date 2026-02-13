export const SUCCESS_MESSAGE_DURATION_MS = 5000

/**
 * Z-index hierarchy for layered UI elements.
 * Higher values appear on top of lower values.
 */
export const Z_INDEX = {
  NAVBAR: 50,
  OVERLAY: 50,
  CALIBRATION_OVERLAY: 60,
  CALIBRATION_CONTENT: 70,
  CALIBRATION_POINT: 80,
} as const

/**
 * Standard icon sizes using Tailwind classes.
 */
export const ICON_SIZE = {
  XS: 'w-3 h-3',
  SM: 'w-4 h-4',
  MD: 'w-5 h-5',
  LG: 'w-6 h-6',
  XL: 'w-8 h-8',
  XXL: 'w-16 h-16',
} as const

export const MIN_WINDOW_WIDTH = 1000
export const MIN_WINDOW_HEIGHT = 600
export const MODAL_BACKDROP_BLUR = 3
export const MODAL_BACKDROP_OPACITY = 0
export const WINDOW_SIZE_WARNING_MESSAGE =
  'Your screen size is too small to fully experience the content.'
