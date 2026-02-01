/**
 * Split text into an array of words, filtering empty strings.
 * Canonical implementation used across the codebase.
 */
export function splitTextToWords(text: string): string[] {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return []
  }
  return text.split(/\s+/).filter((word) => word.length > 0)
}
