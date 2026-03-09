import { CONTAINER_CENTER } from '../constants/adaptive'

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

export function clampNormalized(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function getViewportCenter(): { x: number; y: number } {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }
}

/**
 * Calculate dynamic threshold for centered text based on fill ratio.
 *
 * For centered text, thresholds shift proportionally with text width:
 * - Full-width text (ratio=1): threshold equals staticThreshold
 * - Half-width centered text (ratio=0.5): threshold shifts toward center
 *
 * Formula: containerCenter + textFillRatio * (staticThreshold - containerCenter)
 *
 * @param textFillRatio - Ratio of text width to container width (0-1)
 * @param staticThreshold - Original threshold for full-width text (e.g., 0.75)
 * @param containerCenter - Center position of container (default: CONTAINER_CENTER)
 * @returns Dynamic threshold adjusted for text fill ratio
 */
export function calculateDynamicThreshold(
  textFillRatio: number,
  staticThreshold: number,
  containerCenter: number = CONTAINER_CENTER
): number {
  return containerCenter + textFillRatio * (staticThreshold - containerCenter)
}
