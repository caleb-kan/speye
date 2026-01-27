// Scroll target position as fraction from top (1/3 = upper third of viewport)
export const SCROLL_POSITION_DIVISOR = 3
// Height per line in pixels (at 2xl font with leading-relaxed)
export const HEIGHT_PER_LINE = 40
// Extra height to show partial next line for smooth transition (in pixels) - dynamic mode only
export const TRANSITION_BUFFER = 28
// Fade gradient height in pixels for dynamic mode
export const FADE_HEIGHT = 64

// Minimum transition duration for smoothness (ms)
export const MIN_TRANSITION_MS = 50
// Maximum transition duration (ms)
export const MAX_TRANSITION_MS = 400

// Static mode: estimated words per line for render limit calculation
// Conservative estimate to ensure overflow detection works across text widths
export const WORDS_PER_LINE_ESTIMATE = 20
