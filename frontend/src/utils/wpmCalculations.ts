/**
 * Convert words-per-minute to milliseconds-per-word.
 * @param wpm - Words per minute
 * @returns Milliseconds per word
 */
export function wpmToMsPerWord(wpm: number): number {
  return (60 / wpm) * 1000
}

/**
 * Calculate WPM from elapsed time and words read.
 * @param wordsRead - Number of words read
 * @param elapsedMs - Elapsed time in milliseconds
 * @returns Words per minute (rounded), or 0 if inputs are invalid
 */
export function calculateWpmFromReading(
  wordsRead: number,
  elapsedMs: number
): number {
  if (elapsedMs <= 0 || wordsRead <= 0) return 0
  const elapsedMinutes = elapsedMs / 60000
  return Math.round(wordsRead / elapsedMinutes)
}
