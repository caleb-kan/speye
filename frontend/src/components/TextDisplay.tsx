import { useEffect, useRef, useMemo, useCallback } from 'react'
import type { Scrolling } from '../types/reading'
import { getWordStyle, MAX_BLUR, BLUR_PADDING_BUFFER } from '../utils/wordStyle'

type TextDisplayProps = {
  text: string
  currentWordIndex: number
  isPlaying: boolean
  scrolling: Scrolling
  blurEnabled: boolean
  wpm: number
}

// For static mode: ~24 words to fill 3 lines at 2xl font
const WORDS_PER_CHUNK = 24
// Scroll target position as fraction from top (1/3 = upper third of viewport)
const SCROLL_POSITION_DIVISOR = 3
// Fixed height for dynamic mode container (fits ~3 lines at 2xl font)
const DYNAMIC_MODE_HEIGHT = '280px'
// Fade gradient height in pixels for dynamic mode
const FADE_HEIGHT = 64

// Minimum transition duration for smoothness (ms)
const MIN_TRANSITION_MS = 50
// Maximum transition duration (ms)
const MAX_TRANSITION_MS = 400

export function TextDisplay({
  text,
  currentWordIndex,
  isPlaying,
  scrolling,
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

  // Dynamic mode scrolling
  useEffect(() => {
    if (
      scrolling === 'dynamic' &&
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
  }, [currentWordIndex, isPlaying, scrolling])

  // Update fade masks based on scroll position using CSS custom properties (no React state)
  const updateFades = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const maxScroll = scrollHeight - clientHeight

    // Top fade: only when there's content above
    const topFade = scrollTop > 0 ? FADE_HEIGHT : 0
    container.style.setProperty('--top-fade', `${topFade}px`)

    // Bottom fade: only when there's content below
    const bottomFade = scrollTop < maxScroll - 1 ? FADE_HEIGHT : 0
    container.style.setProperty('--bottom-fade', `${bottomFade}px`)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || scrolling !== 'dynamic') return

    // Set initial state (no top fade, bottom fade present if content overflows)
    container.style.setProperty('--top-fade', '0px')
    const hasOverflow = container.scrollHeight > container.clientHeight
    container.style.setProperty(
      '--bottom-fade',
      hasOverflow ? `${FADE_HEIGHT}px` : '0px'
    )

    container.addEventListener('scroll', updateFades, { passive: true })
    return () => container.removeEventListener('scroll', updateFades)
  }, [scrolling, updateFades, words])

  // Static mode: display words in chunks
  if (scrolling === 'static') {
    const currentChunk = Math.floor(currentWordIndex / WORDS_PER_CHUNK)
    const chunkStartIndex = currentChunk * WORDS_PER_CHUNK
    const chunkWords = words.slice(
      chunkStartIndex,
      chunkStartIndex + WORDS_PER_CHUNK
    )

    return (
      <div className="relative mx-auto w-full">
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

  // Dynamic mode with CSS mask for fade edges
  // --top-fade: 0px initially, 64px when scrolled (content above)
  // --bottom-fade: 64px initially if overflow, 0px when at end (no content below)
  return (
    <div className="relative mx-auto w-full animate-fade-in">
      <div
        ref={containerRef}
        className="text-2xl leading-relaxed select-none overflow-hidden"
        style={{
          height: DYNAMIC_MODE_HEIGHT,
          maskImage: `linear-gradient(to bottom, transparent 0%, black var(--top-fade, 0px), black calc(100% - var(--bottom-fade, 0px)), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black var(--top-fade, 0px), black calc(100% - var(--bottom-fade, 0px)), transparent 100%)`,
          padding: `${MAX_BLUR + BLUR_PADDING_BUFFER}px`,
        }}
      >
        <div className="pb-16">
          {words.map((word, index) => {
            const isActive = index === currentWordIndex
            const distance = index - currentWordIndex
            const style = getWordStyle(distance, blurEnabled)

            return (
              <span
                key={index}
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
    </div>
  )
}
