// Gaze Smoothing
export const GAZE_SMOOTHING_WINDOW_MS = 500
export const GAZE_MIN_SAMPLES = 8
export const GAZE_MIN_FILTERED_SAMPLES_FACTOR = 0.6

// Hysteresis thresholds for reliability state transitions
export const CONFIDENCE_THRESHOLD_ON = 0.35
export const CONFIDENCE_THRESHOLD_OFF = 0.25

// Velocity filtering
export const MAX_GAZE_VELOCITY = 12
export const MAX_GAP_BEFORE_RESET_MS = 500
export const STATE_UPDATE_INTERVAL_MS = 33
export const MIN_FRAME_INTERVAL_MS = 5

// Adaptive velocity calculation thresholds
// Used when calculating velocity after time gaps
export const VELOCITY_GAP_THRESHOLD_MS = 100
export const VELOCITY_GAP_SCALE_FACTOR = 200

/**
 * Return Sweep Detection Algorithm
 * =================================
 * Detects when the reader finishes a line and sweeps their gaze back to start.
 *
 * The algorithm uses velocity transition detection rather than just position:
 * 1. Track gaze until it reaches the "end zone" (right side of container)
 * 2. Once in end zone, monitor for velocity TRANSITION: stationary -> leftward
 * 3. This catches the moment the return sweep begins, providing immediate response
 *
 * Detection methods (in priority order):
 * - Primary: Velocity transition while still near end zone (most responsive)
 * - Secondary: Significant leftward velocity anywhere after reaching end zone
 * - Fallback: Position-based when insufficient velocity samples
 */

// End-of-line and return sweep detection
/** Normalized X position (0-1) threshold for end zone (right side) */
export const END_OF_LINE_THRESHOLD = 0.75
/** Normalized X position to start watching for velocity changes (slightly before end zone) */
export const END_ZONE_EARLY_DETECTION = 0.65
/** Normalized X position fallback threshold for return sweep (when velocity unreliable) */
export const RETURN_SWEEP_THRESHOLD = 0.5
/**
 * Minimum leftward velocity (normalized units/ms) to confirm return sweep.
 * A more negative velocity indicates faster leftward movement.
 */
export const RETURN_SWEEP_VELOCITY_THRESHOLD = 0.0006
/**
 * Velocity change threshold to detect movement start (transition from stationary).
 * When velocity exceeds this in the negative (leftward) direction, a return sweep is starting.
 */
export const VELOCITY_TRANSITION_THRESHOLD = 0.0002
/**
 * Below this velocity magnitude, gaze is considered stationary.
 * Used to distinguish between stationary gaze and intentional movement.
 */
export const VELOCITY_DIRECTION_THRESHOLD = 0.00005
/**
 * Minimum samples needed for reliable velocity calculation.
 * 4 samples provides ~2 points at each end of the velocity window for noise resistance.
 */
export const VELOCITY_SAMPLE_COUNT = 4
/**
 * Time window (ms) for velocity calculation.
 * 120ms balances responsiveness (~4 samples at 30fps) with noise filtering.
 */
export const VELOCITY_WINDOW_MS = 120
/**
 * Minimum debounce time (ms) between chunk advances.
 * Prevents double-triggers from noisy return sweeps while staying responsive.
 */
export const MIN_ADVANCE_DEBOUNCE_MS = 75

// Single-line display
export const DEFAULT_CONTAINER_WIDTH = 800
export const SINGLE_LINE_FONT_SIZE = 28
export const SINGLE_LINE_FONT_WEIGHT = '500'
export const SINGLE_LINE_LINE_HEIGHT = 1.4
export const SINGLE_LINE_HEIGHT = 120

/**
 * Horizontal padding on each side of text container (px).
 * Must match CSS: px-4 = 16px on ReadingAreaContainer and SingleLineTextDisplay.
 */
export const TEXT_CONTAINER_PADDING_X = 16

/**
 * Shared container classes for adaptive reading area.
 * Must stay in sync with TEXT_CONTAINER_PADDING_X (px-4 = 16px).
 */
export const READING_CONTAINER_CLASSES = 'px-4 py-6 rounded-xl'

export const DEFAULT_FONT_FAMILY = 'system-ui, sans-serif'
export const TEXT_FIT_BUFFER = 0.98
/** Factor applied to END_OF_LINE_THRESHOLD for early visual feedback */
export const END_ZONE_APPROACH_FACTOR = 0.9

/**
 * Minimum text fill ratio (0-1) for dynamic threshold calculation.
 * Prevents division issues and ensures end-zone is always reachable.
 */
export const MIN_TEXT_FILL_RATIO = 0.1

/**
 * Container center position (0.5 = 50%) for centered text calculations.
 * Used as the anchor point for dynamic threshold adjustments.
 */
export const CONTAINER_CENTER = 0.5
/** Minimum seconds of reading before calculating WPM (avoids noisy early estimates) */
export const MIN_READING_TIME_FOR_WPM = 3
/**
 * Grace period (ms) after chunk change where gaze is ignored.
 * Matches TRANSITION_DURATION_MS to prevent false triggers during
 * the crossfade animation, then immediately resumes tracking.
 */
export const CHUNK_IGNORE_PERIOD_MS = 50

/**
 * Duration (ms) for chunk transition animations.
 * Set to 50ms for near-instant switching so new line appears
 * before eye completes return sweep to the left.
 * Must stay in sync with CSS variable --adaptive-transition-duration in index.css.
 */
export const TRANSITION_DURATION_MS = 50

/**
 * Fallback value used when CSS variable is unavailable (SSR, tests).
 * Should match TRANSITION_DURATION_MS.
 */
export const TRANSITION_DURATION_MS_FALLBACK = 50

/**
 * CSS variable name for transition duration.
 * Single source of truth is in index.css; JS uses this for inline styles.
 */
export const CSS_VAR_TRANSITION_DURATION = '--adaptive-transition-duration'

/** Border transition duration - MUST match TRANSITION_DURATION_MS for consistency */
export const BORDER_TRANSITION_MS = TRANSITION_DURATION_MS

/** Calibration point animation transition duration (ms) */
export const CALIBRATION_POINT_TRANSITION_MS = 200

/** End zone gradient fade transition duration (ms) */
export const END_ZONE_FADE_TRANSITION_MS = 200

/** Easing curve for entering/appearing text (fast start, gentle settle) */
export const TRANSITION_EASE_ENTER = 'cubic-bezier(0, 0, 0.2, 1)'

/** Easing curve for exiting/fading text (gentle start, fast exit) */
export const TRANSITION_EASE_EXIT = 'cubic-bezier(0.4, 0, 1, 1)'

/** ProgressBar display height (px) */
export const PROGRESS_BAR_HEIGHT = 8

/** GPU hint for opacity animations */
export const WILL_CHANGE_OPACITY = 'opacity'

// WebGazer initialization
export const WEBGAZER_INIT_TIMEOUT_MS = 60000
export const WEBGAZER_READY_MAX_ATTEMPTS = 300
export const WEBGAZER_READY_CHECK_INTERVAL_MS = 100
export const WEBGAZER_GAZE_DOT_ID = 'webgazerGazeDot'
export const WEBGAZER_DOT_STYLE_ID = 'webgazer-dot-visibility'
export const WEBGAZER_REGRESSION_MODEL = 'weightedRidge'

// Gaze analysis
export const OUTLIER_STDDEV_THRESHOLD = 2.5
export const GAZE_CONFIDENCE_SENSITIVITY = 10

// Calibration
export const CALIBRATION_EVENT_TYPE = 'click'

// Container background opacities (for color-mix percentages)
export const CONTAINER_BG_TRACKING_OPACITY = 8
export const CONTAINER_BG_IDLE_OPACITY = 5

// Border opacities (for color-mix percentages)
export const BORDER_END_ZONE_OPACITY = 60
export const BORDER_TRACKING_OPACITY = 30
export const BORDER_IDLE_OPACITY = 20

// End zone gradient opacities (for color-mix percentages)
export const END_ZONE_SWEEP_OPACITY = 40
export const END_ZONE_ACTIVE_OPACITY = 20
export const END_ZONE_APPROACHING_OPACITY = 10

// Text opacity when tracking is unreliable
export const TEXT_UNRELIABLE_OPACITY = 0.7
