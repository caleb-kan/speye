import { useEffect, useRef, useMemo } from 'react'
import type { ReadingType } from '../types/reading'
import { getWordStyle } from '../utils/wordStyle'

type TextDisplayProps = {
  text: string
  currentWordIndex: number
  isPlaying: boolean
  readingType: ReadingType
  blurEnabled: boolean
  wpm: number
}

// For static mode: ~24 words to fill 3 lines at 2xl font
const WORDS_PER_CHUNK = 24
// Number of words from end to hide the fade gradient
const WORDS_NEAR_END_THRESHOLD = 10
// Scroll target position as fraction from top (1/3 = upper third of viewport)
const SCROLL_POSITION_DIVISOR = 3
// Fixed height for dynamic mode container (fits ~3 lines at 2xl font)
const DYNAMIC_MODE_HEIGHT = '280px'

// Minimum transition duration for smoothness (ms)
const MIN_TRANSITION_MS = 50
// Maximum transition duration (ms)
const MAX_TRANSITION_MS = 400

export function TextDisplay({
  text,
  currentWordIndex,
  isPlaying,
  readingType,
  blurEnabled,
  wpm,
}: TextDisplayProps) {
  // Calculate transition duration based on WPM
  // Transition should be at most 80% of time per word for smooth highlighting
  const msPerWord = (60 / wpm) * 1000
  const transitionMs = Math.max(
    MIN_TRANSITION_MS,
    Math.min(MAX_TRANSITION_MS, msPerWord * 0.8)
  )
  const wordTransition = `color ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1), filter ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1)`
  const containerRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement>(null)

  const words = useMemo(
    () => text.split(/\s+/).filter((w) => w.length > 0),
    [text]
  )
  const isNearEnd = currentWordIndex >= words.length - WORDS_NEAR_END_THRESHOLD

  // Compute current chunk from word index
  const currentChunk = Math.floor(currentWordIndex / WORDS_PER_CHUNK)

  const chunks = useMemo(() => {
    const result: string[][] = []
    for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
      result.push(words.slice(i, i + WORDS_PER_CHUNK))
    }
    return result
  }, [words])

  // Dynamic mode scrolling
  useEffect(() => {
    if (
      readingType === 'dynamic' &&
      activeWordRef.current &&
      containerRef.current
    ) {
      const container = containerRef.current
      const activeWord = activeWordRef.current
      const containerRect = container.getBoundingClientRect()
      const wordRect = activeWord.getBoundingClientRect()

      const relativeTop = wordRect.top - containerRect.top + container.scrollTop
      const targetScroll =
        relativeTop - containerRect.height / SCROLL_POSITION_DIVISOR

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: isPlaying ? 'smooth' : 'auto',
      })
    }
  }, [currentWordIndex, isPlaying, readingType])

  if (readingType === 'static') {
    const chunkWords = chunks[currentChunk] || []
    const chunkStartIndex = currentChunk * WORDS_PER_CHUNK

    return (
      <div className="relative max-w-5xl mx-auto w-full">
        <div
          key={currentChunk}
          className="text-2xl leading-relaxed select-none animate-fade-in"
        >
          {chunkWords.map((word, index) => {
            const globalIndex = chunkStartIndex + index
            const localDistance = index - (currentWordIndex - chunkStartIndex)
            const style = getWordStyle(localDistance, blurEnabled)

            return (
              <span
                key={globalIndex}
                style={{
                  color: style.color,
                  opacity: style.opacity,
                  filter: style.blur > 0 ? `blur(${style.blur}px)` : 'none',
                  transition: wordTransition,
                }}
              >
                {word}{' '}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  // Dynamic mode with smooth highlight
  return (
    <div className="relative max-w-5xl mx-auto w-full">
      {/* Scrolling text container */}
      <div
        ref={containerRef}
        className="text-2xl leading-relaxed select-none overflow-hidden"
        style={{ height: DYNAMIC_MODE_HEIGHT }}
      >
        <div className="pb-16">
          {words.map((word, index) => {
            const isActive = index === currentWordIndex
            const distance = index - currentWordIndex
            const style = getWordStyle(distance, blurEnabled)

            return (
              <span
                key={`${word}-${index}`}
                ref={isActive ? activeWordRef : null}
                style={{
                  color: style.color,
                  opacity: style.opacity,
                  filter: style.blur > 0 ? `blur(${style.blur}px)` : 'none',
                  transition: wordTransition,
                }}
              >
                {word}{' '}
              </span>
            )
          })}
        </div>
      </div>

      {/* Bottom fade - hide when near end */}
      {!isNearEnd && (
        <div
          className="absolute bottom-0 left-0 right-0 h-16 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to top, var(--color-bg) 0%, transparent 100%)`,
          }}
        />
      )}
    </div>
  )
}
