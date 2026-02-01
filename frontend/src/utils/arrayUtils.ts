/**
 * In-place array pruning utilities for high-frequency operations.
 * Avoids GC pressure by modifying arrays in place rather than creating new ones.
 */

/**
 * Prunes array in-place, keeping only elements with timestamp >= windowStart.
 * Uses write-index pattern to avoid array allocation at high frame rates.
 *
 * @param array - Array to prune (modified in place)
 * @param windowStart - Minimum timestamp to keep
 * @param getTimestamp - Function to extract timestamp from element
 */
export function pruneByTime<T>(
  array: T[],
  windowStart: number,
  getTimestamp: (item: T) => number
): void {
  let writeIdx = 0
  for (let i = 0; i < array.length; i++) {
    if (getTimestamp(array[i]) >= windowStart) {
      array[writeIdx++] = array[i]
    }
  }
  array.length = writeIdx
}
