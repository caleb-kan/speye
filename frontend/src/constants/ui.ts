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

/**
 * Rendered height of a horizontal noUiSlider (matches the library's CSS).
 * Reserve this on slider placeholder `<div>`s so the OptionsBar layout
 * doesn't shift after noUiSlider initializes in a post-mount useEffect.
 */
export const SLIDER_RENDERED_HEIGHT_PX = 18

/**
 * Min-height for the OptionsBar so the bar (and the content below it)
 * does not shift vertically when the user switches reading modes. Adaptive
 * has fewer controls than Standard/RSVP and would otherwise collapse to a
 * single-row bar — the difference is a visible vertical layout shift on
 * mode change. Single-row content is centered via `align-content: center`.
 *
 * Two breakpoints because Standard mode flex-wraps to 2 rows at wide
 * viewports and 3 rows at narrow viewports — a single min-height can't
 * stabilise both ranges without leaving large gaps at the other.
 */
export const OPTIONS_BAR_MIN_HEIGHT_WIDE_PX = 120
export const OPTIONS_BAR_MIN_HEIGHT_NARROW_PX = 175

/**
 * Reserved width for the "current: NN" badge in `ComplexitySelector`.
 * Must exceed the rendered width of the widest valid value
 * (`current: ${MAX_COMPLEXITY}`) so the badge stays the same size whether
 * `currentTextComplexity` is the placeholder, a 1-digit number, or a
 * 2-digit number. Stable width prevents the OptionsBar's centered flex
 * layout from shifting horizontally when the value populates.
 */
export const COMPLEXITY_BADGE_MIN_WIDTH = '7rem'
