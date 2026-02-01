/**
 * Calculate reading progress as a percentage.
 *
 * @param currentIndex - Current position (0-based index)
 * @param total - Total number of items
 * @returns Progress percentage (0-100)
 */
export function calculateProgressPercentage(
  currentIndex: number,
  total: number
): number {
  if (total <= 0) return 0
  return ((currentIndex + 1) / total) * 100
}
