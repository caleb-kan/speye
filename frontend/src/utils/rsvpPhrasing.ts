/**
 * Groups words into phrases where each phrase does not exceed
 * the given max character length (phraseSize).
 */
export function buildPhrases(
  words: string[],
  maxCharsPerPhrase: number
): string[] {
  const result: string[] = []
  let current = ''
  for (const word of words) {
    if (current && current.length + 1 + word.length > maxCharsPerPhrase) {
      result.push(current)
      current = word
    } else {
      current = current ? current + ' ' + word : word
    }
  }
  if (current) result.push(current)
  return result
}

/** Returns the word count for each phrase. */
export function getPhraseWordCounts(phrases: string[]): number[] {
  return phrases.map((p) => p.split(/\s+/).filter(Boolean).length)
}

/** Returns cumulative word counts at each phrase boundary. */
export function getCumulativeWordCounts(phraseWordCounts: number[]): number[] {
  const result: number[] = []
  let sum = 0
  for (const count of phraseWordCounts) {
    result.push(sum)
    sum += count
  }
  return result
}

/** Finds the phrase index that contains the given word index. */
export function findPhraseIndexForWord(
  cumulativeWordCounts: number[],
  wordIndex: number,
  totalPhrases: number
): number {
  if (totalPhrases <= 0) return 0
  if (wordIndex <= 0) return 0

  let idx = 0
  for (let i = 0; i < cumulativeWordCounts.length; i++) {
    if (cumulativeWordCounts[i] <= wordIndex) idx = i
    else break
  }
  return Math.min(idx, totalPhrases - 1)
}
