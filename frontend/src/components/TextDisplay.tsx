import {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from 'react'
import type { Scrolling } from '../types/reading'
import { getWordStyle, MAX_BLUR, BLUR_PADDING_BUFFER } from '../utils/wordStyle'
import {
  SCROLL_POSITION_DIVISOR,
  HEIGHT_PER_LINE,
  TRANSITION_BUFFER,
  FADE_HEIGHT,
  MIN_TRANSITION_MS,
  MAX_TRANSITION_MS,
  WORDS_PER_LINE_ESTIMATE,
} from '../constants/textDisplay'

type TextDisplayProps = {
  text: string
  currentWordIndex: number
  isPlaying: boolean
  scrolling: Scrolling
  blurEnabled: boolean
  wpm: number
  visibleLines: number
}

export function TextDisplay({
  text,
  currentWordIndex,
  isPlaying,
  scrolling,
  blurEnabled,
  wpm,
  visibleLines,
}: TextDisplayProps) {
  // Container heights based on visible lines
  const staticModeHeight = `${HEIGHT_PER_LINE * visibleLines}px`
  const dynamicModeHeight = `${HEIGHT_PER_LINE * visibleLines + TRANSITION_BUFFER}px`

  // Padding to prevent blur effects from being clipped at container edges
  const blurPadding = MAX_BLUR + BLUR_PADDING_BUFFER

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
    () =>
      typeof text === 'string' && text.trim().length > 0
        ? text.split(/\s+/).filter((word) => word.length > 0)
        : [],
    [text]
  )

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

  const updateFades = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const maxScroll = scrollHeight - clientHeight

    const topFade = scrollTop > 0 ? FADE_HEIGHT : 0
    container.style.setProperty('--top-fade', `${topFade}px`)

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

  // Static mode: display words in chunks that fit within the visible lines height
  const staticContainerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map())
  const [pageStartIndex, setPageStartIndex] = useState(0)

  // Handle backwards navigation using React's "derived state during render" pattern.
  // This is a documented React pattern for adjusting state when props change.
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const needsBackwardsFlip =
    scrolling === 'static' && currentWordIndex < pageStartIndex
  if (needsBackwardsFlip) {
    setPageStartIndex(currentWordIndex)
  }

  // Clear word refs when page changes to prevent memory accumulation
  useEffect(() => {
    wordRefs.current.clear()
  }, [pageStartIndex])

  // Handle forward navigation - detect when current word overflows container
  useLayoutEffect(() => {
    if (scrolling !== 'static') return
    if (needsBackwardsFlip) return

    const container = staticContainerRef.current
    const currentWordEl = wordRefs.current.get(currentWordIndex)

    if (!container || !currentWordEl) return

    const containerRect = container.getBoundingClientRect()
    const wordRect = currentWordEl.getBoundingClientRect()

    if (
      wordRect.bottom > containerRect.bottom ||
      wordRect.top < containerRect.top
    ) {
      queueMicrotask(() => setPageStartIndex(currentWordIndex))
    }
  }, [currentWordIndex, scrolling, pageStartIndex, needsBackwardsFlip])

  if (words.length === 0) {
    return (
      <div className="mx-auto w-full h-48 flex items-center justify-center text-center text-text-secondary">
        <p>No text content available.</p>
      </div>
    )
  }

  if (scrolling === 'static') {
    // Render enough words for overflow detection
    const wordsPerPage = (visibleLines + 1) * WORDS_PER_LINE_ESTIMATE
    const maxWordsToRender = Math.min(
      words.length - pageStartIndex,
      wordsPerPage
    )
    const wordsToRender = words.slice(
      pageStartIndex,
      pageStartIndex + maxWordsToRender
    )

    return (
      <div className="relative mx-auto w-full">
        {/* Outer wrapper provides space for blur to extend into */}
        <div
          key={pageStartIndex}
          className="animate-fade-in"
          style={{ padding: `${blurPadding}px` }}
        >
          {/* Inner container clips content at bottom, allows blur to extend on other sides */}
          <div
            ref={staticContainerRef}
            className="text-2xl leading-relaxed select-none"
            style={{
              height: staticModeHeight,
              // clip-path clips content AND blur effects (unlike overflow:hidden)
              // Extend outward on top/left/right for blur, clip at bottom for overflow
              clipPath: `inset(-${blurPadding}px -${blurPadding}px 0 -${blurPadding}px)`,
            }}
          >
            {wordsToRender.map((word, index) => {
              const globalIndex = pageStartIndex + index
              const localDistance = globalIndex - currentWordIndex
              const style = getWordStyle(localDistance, blurEnabled)

              return (
                <span
                  key={globalIndex}
                  ref={(el) => {
                    if (el) {
                      wordRefs.current.set(globalIndex, el)
                    } else {
                      wordRefs.current.delete(globalIndex)
                    }
                  }}
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

  // Dynamic mode with CSS mask for fade edges
  // --top-fade: 0px initially, 64px when scrolled (content above)
  // --bottom-fade: 64px initially if overflow, 0px when at end (no content below)
  return (
    <div className="relative mx-auto w-full animate-fade-in">
      <div
        ref={containerRef}
        className="text-2xl leading-relaxed select-none overflow-hidden"
        style={{
          height: dynamicModeHeight,
          maskImage: `linear-gradient(to bottom, transparent 0%, black var(--top-fade, 0px), black calc(100% - var(--bottom-fade, 0px)), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black var(--top-fade, 0px), black calc(100% - var(--bottom-fade, 0px)), transparent 100%)`,
          padding: `${blurPadding}px`,
          boxSizing: 'content-box',
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
