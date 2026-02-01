import {
  SINGLE_LINE_FONT_SIZE,
  SINGLE_LINE_FONT_WEIGHT,
  SINGLE_LINE_LINE_HEIGHT,
  TEXT_FIT_BUFFER,
} from '../constants/adaptive'
import { splitTextToWords } from './textParsing'

export type ChunkData = {
  text: string
  wordCount: number
}

/**
 * Split text into chunks that fit the available width.
 * Each chunk includes word count for accurate WPM calculation.
 */
export function splitTextToFitWidthWithMetadata(
  text: string,
  availableWidth: number,
  fontFamily: string
): ChunkData[] {
  const words = splitTextToWords(text)
  if (words.length === 0) return []
  if (availableWidth <= 0)
    return [{ text: words.join(' '), wordCount: words.length }]

  const measureSpan = document.createElement('span')
  measureSpan.style.visibility = 'hidden'
  measureSpan.style.position = 'absolute'
  measureSpan.style.whiteSpace = 'nowrap'
  measureSpan.style.fontWeight = SINGLE_LINE_FONT_WEIGHT
  measureSpan.style.fontFamily = fontFamily
  measureSpan.style.fontSize = `${SINGLE_LINE_FONT_SIZE}px`
  measureSpan.style.lineHeight = String(SINGLE_LINE_LINE_HEIGHT)
  document.body.appendChild(measureSpan)

  try {
    const chunks: ChunkData[] = []
    let currentWords: string[] = []

    for (const word of words) {
      const testChunk = [...currentWords, word].join(' ')
      measureSpan.textContent = testChunk
      const width = measureSpan.offsetWidth

      if (width <= availableWidth * TEXT_FIT_BUFFER) {
        currentWords.push(word)
      } else if (currentWords.length === 0) {
        // Single word exceeds width - use it as its own chunk
        chunks.push({ text: word, wordCount: 1 })
      } else {
        chunks.push({
          text: currentWords.join(' '),
          wordCount: currentWords.length,
        })
        currentWords = [word]
      }
    }

    if (currentWords.length > 0) {
      chunks.push({
        text: currentWords.join(' '),
        wordCount: currentWords.length,
      })
    }

    return chunks
  } finally {
    document.body.removeChild(measureSpan)
  }
}
