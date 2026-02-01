/**
 * Gaze coordinate normalization utilities.
 *
 * These functions provide consistent coordinate transformations
 * for gaze tracking across the adaptive reading system.
 */

/**
 * Normalize gaze X coordinate to 0-1 range within container bounds.
 *
 * @param gazeX - Raw gaze X coordinate in pixels
 * @param containerLeft - Left edge of container in pixels
 * @param containerWidth - Width of container in pixels
 * @returns Normalized X position (0 = left edge, 1 = right edge)
 */
export function normalizeGazeX(
  gazeX: number,
  containerLeft: number,
  containerWidth: number
): number {
  if (containerWidth <= 0) return 0
  return (gazeX - containerLeft) / containerWidth
}

/**
 * Clamp a value to the 0-1 range.
 *
 * @param value - Value to clamp
 * @returns Value clamped to [0, 1], or 0 if NaN
 */
export function clampNormalized(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

/**
 * Get viewport center coordinates.
 *
 * @returns Object with x and y coordinates of viewport center
 */
export function getViewportCenter(): { x: number; y: number } {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }
}
