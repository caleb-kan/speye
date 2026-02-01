/** Number of clicks required per calibration point. */
export const CALIBRATION_CLICKS_PER_POINT = 5

/** Minimum accuracy percentage required to pass calibration. */
export const CALIBRATION_ACCURACY_THRESHOLD = 50

/** Number of gaze samples to collect for accuracy measurement. */
export const ACCURACY_SAMPLE_COUNT = 50

/** Time in ms to collect accuracy samples. */
export const ACCURACY_COLLECTION_MS = 5000

/** Maximum time (ms) to wait for accuracy samples before using available data. */
export const ACCURACY_MAX_WAIT_MS = 10000

/** Minimum samples required for accuracy calculation when timeout is reached. */
export const MIN_ACCURACY_SAMPLES = 20

/** Calibration expiry time in ms (7 days). */
export const CALIBRATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

// Calibration Point Positions
/** Horizontal positions (0-1) for main calibration points. */
export const CALIBRATION_HORIZONTAL_POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9]

/** Horizontal positions (0-1) for supplemental calibration points. */
export const CALIBRATION_SUPPLEMENTAL_X_POSITIONS = [0.25, 0.75]

/** Vertical offset factors (0-1) for supplemental points. */
export const CALIBRATION_VERTICAL_TOP_FACTOR = 0.3
export const CALIBRATION_VERTICAL_BOTTOM_FACTOR = 0.7

/** Visual size of calibration points in pixels. */
export const CALIBRATION_POINT_SIZE = 50

/** Size of inner dot in calibration points. */
export const CALIBRATION_POINT_INNER_SIZE = 10

// Accuracy Test
/** Countdown seconds before accuracy measurement starts. */
export const ACCURACY_COUNTDOWN_SECONDS = 3

/** Delay in ms to display "calculating" state. */
export const CALCULATION_DISPLAY_DELAY_MS = 500

/** Delay in ms to display result before calling onComplete. */
export const RESULT_DISPLAY_DELAY_MS = 2000

/** Factor of viewport height used as max distance for precision scaling. */
export const ACCURACY_MAX_DISTANCE_FACTOR = 0.5

/** Vertical offset in pixels for accuracy instructions below target. */
export const ACCURACY_INSTRUCTIONS_OFFSET_PX = 60

/** Progress bar transition duration (ms) during accuracy test. */
export const ACCURACY_PROGRESS_TRANSITION_MS = 100

// Calibration Point Animation
/** Factor to shrink point size as clicks complete (0-1). */
export const CALIBRATION_POINT_SHRINK_FACTOR = 0.4

/** Base opacity for active calibration points (0-1). */
export const CALIBRATION_POINT_BASE_OPACITY = 0.4

/** Opacity for upcoming (inactive) calibration points. */
export const CALIBRATION_UPCOMING_OPACITY = 0.3

/** Size multiplier for upcoming calibration points. */
export const CALIBRATION_UPCOMING_SIZE_FACTOR = 0.5

/** Delay in ms before recording screen position after click. */
export const CALIBRATION_CLICK_SETTLE_MS = 100

/** Minimum time (ms) between calibration clicks to prevent rapid double-clicks. */
export const CALIBRATION_CLICK_DEBOUNCE_MS = 150

/** Default number of calibration points. */
export const DEFAULT_CALIBRATION_POINT_COUNT = 9

/** Minimum container width (px) required for calibration. */
export const MIN_CALIBRATION_AREA_WIDTH = 200

/** Font size for calibration progress instruction text. */
export const CALIBRATION_INSTRUCTION_FONT_SIZE = 24

// Calibration Drift Detection
/** Duration (ms) of unreliable tracking to trigger drift warning. */
export const DRIFT_UNRELIABLE_DURATION_MS = 10000

/** Duration (ms) of reliable tracking needed to clear drift warning. */
export const DRIFT_RECOVERY_DURATION_MS = 5000

/**
 * Ratio of DRIFT_UNRELIABLE_DURATION_MS at which status transitions to 'degrading'.
 * At 0.5, status becomes 'degrading' at 5000ms unreliable before 'poor' at 10000ms.
 */
export const DRIFT_DEGRADING_RATIO = 0.5

/** Minimum time (ms) of reading before drift detection activates. */
export const DRIFT_WARMUP_PERIOD_MS = 5000

/** Interval (ms) for polling drift detection status. */
export const DRIFT_POLL_INTERVAL_MS = 500

/** SVG checkmark stroke width in calibration points. */
export const CHECKMARK_STROKE_WIDTH = 3
