import { useEffect, useRef, useCallback, useMemo } from 'react'
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
  TRANSITION_SPEED_FACTOR,
} from '../constants/textDisplay'
import { splitTextToWords } from '../utils/textParsing'
import { wpmToMsPerWord } from '../utils/wpmCalculations'
import { useStaticPagination } from '../hooks/useStaticPagination'
import { WordSpan } from './WordSpan'

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
  const staticModeHeight = `${HEIGHT_PER_LINE * visibleLines}px`
  const dynamicModeHeight = `${HEIGHT_PER_LINE * visibleLines + TRANSITION_BUFFER}px`

  const blurPadding = MAX_BLUR + BLUR_PADDING_BUFFER

  const msPerWord = wpmToMsPerWord(wpm)
  const transitionMs = Math.max(
    MIN_TRANSITION_MS,
    Math.min(MAX_TRANSITION_MS, msPerWord * TRANSITION_SPEED_FACTOR)
  )
  const wordTransition = `color ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1), filter ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1)`

  const words = useMemo(() => splitTextToWords(text), [text])

  const dynamicContainerRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement>(null)

  const {
    pageStartIndex,
    containerRef: staticContainerRef,
    setWordRef,
  } = useStaticPagination({
    currentWordIndex,
    totalWords: words.length,
    enabled: scrolling === 'static',
  })

  useEffect(() => {
    if (
      scrolling === 'dynamic' &&
      activeWordRef.current &&
      dynamicContainerRef.current
    ) {
      const container = dynamicContainerRef.current
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
    const container = dynamicContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const maxScroll = scrollHeight - clientHeight

    const topFade = scrollTop > 0 ? FADE_HEIGHT : 0
    container.style.setProperty('--top-fade', `${topFade}px`)

    const bottomFade = scrollTop < maxScroll - 1 ? FADE_HEIGHT : 0
    container.style.setProperty('--bottom-fade', `${bottomFade}px`)
  }, [])

  useEffect(() => {
    const container = dynamicContainerRef.current
    if (!container || scrolling !== 'dynamic') return

    container.style.setProperty('--top-fade', '0px')
    const hasOverflow = container.scrollHeight > container.clientHeight
    container.style.setProperty(
      '--bottom-fade',
      hasOverflow ? `${FADE_HEIGHT}px` : '0px'
    )

    container.addEventListener('scroll', updateFades, { passive: true })
    return () => container.removeEventListener('scroll', updateFades)
  }, [scrolling, updateFades, words])

  if (words.length === 0) {
    return (
      <div className="mx-auto w-full h-48 flex items-center justify-center text-center text-text-secondary">
        <p>No text content available.</p>
      </div>
    )
  }

  if (scrolling === 'static') {
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
        <div
          key={pageStartIndex}
          className="animate-fade-in"
          style={{ padding: `${blurPadding}px` }}
        >
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
              return (
                <WordSpan
                  key={globalIndex}
                  word={word}
                  globalIndex={globalIndex}
                  currentWordIndex={currentWordIndex}
                  blurEnabled={blurEnabled}
                  transition={wordTransition}
                  setRef={setWordRef(globalIndex)}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-full animate-fade-in">
      <div
        ref={dynamicContainerRef}
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
                  filter: style.blur > 0 ? `blur(${style.blur}px)` : undefined,
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
