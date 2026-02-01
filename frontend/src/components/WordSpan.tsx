import { memo } from 'react'
import { getWordStyle } from '../utils/wordStyle'

type WordSpanProps = {
  /** The word to display */
  word: string
  /** Global index of this word in the full text */
  globalIndex: number
  /** Index of the currently highlighted word */
  currentWordIndex: number
  /** Whether blur effect is enabled */
  blurEnabled: boolean
  /** CSS transition string for styling changes */
  transition: string
  /** Ref callback to register this word's DOM element */
  setRef: (el: HTMLSpanElement | null) => void
}

/**
 * Renders a single word with distance-based styling
 *
 * Features:
 * - Color gradient based on distance from current word
 * - Optional blur effect
 * - Configurable transition timing
 *
 * Used by both TextDisplay and AdaptiveTextDisplay
 */
export const WordSpan = memo(function WordSpan({
  word,
  globalIndex,
  currentWordIndex,
  blurEnabled,
  transition,
  setRef,
}: WordSpanProps) {
  const distance = globalIndex - currentWordIndex
  const style = getWordStyle(distance, blurEnabled)

  return (
    <span
      ref={setRef}
      style={{
        color: style.color,
        opacity: style.opacity,
        filter: style.blur > 0 ? `blur(${style.blur}px)` : undefined,
        transition,
      }}
    >
      {word}{' '}
    </span>
  )
})
