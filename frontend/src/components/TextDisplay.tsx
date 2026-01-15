import { useEffect, useRef, useMemo } from 'react'

type ReadingType = 'dynamic' | 'static'

type TextDisplayProps = {
  text: string
  currentWordIndex: number
  isPlaying: boolean
  readingType: ReadingType
}

// For static mode: ~24 words to fill 3 lines at 2xl font
const WORDS_PER_CHUNK = 24

// Smooth highlight: number of words the highlight spans
const HIGHLIGHT_WIDTH = 6

export function TextDisplay({
  text,
  currentWordIndex,
  isPlaying,
  readingType,
}: TextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement>(null)

  const words = useMemo(
    () => text.split(/\s+/).filter((w) => w.length > 0),
    [text]
  )
  const isNearEnd = currentWordIndex >= words.length - 10

  // Compute current chunk from word index
  const currentChunk = Math.floor(currentWordIndex / WORDS_PER_CHUNK)

  const chunks = useMemo(() => {
    const result: string[][] = []
    for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
      result.push(words.slice(i, i + WORDS_PER_CHUNK))
    }
    return result
  }, [words])

  // Get word style: read (white), highlighted (blue gradient), unread (dim)
  const getWordStyle = (index: number): { color: string; opacity: number } => {
    const distance = index - currentWordIndex

    if (distance <= 0) {
      // Already read (including current word) - white/normal
      return { color: 'var(--color-text)', opacity: 1 }
    } else if (distance <= HIGHLIGHT_WIDTH) {
      // Upcoming highlight zone - primary color fading to secondary
      const t = (distance - 1) / HIGHLIGHT_WIDTH
      return {
        color: `color-mix(in srgb, var(--color-primary) ${Math.round((1 - t) * 100)}%, var(--color-text-secondary))`,
        opacity: 1,
      }
    } else {
      // Not yet read - dimmed
      return { color: 'var(--color-text-secondary)', opacity: 0.6 }
    }
  }

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
      const targetScroll = relativeTop - containerRect.height / 3

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

            let style: { color: string; opacity: number }
            if (localDistance <= 0) {
              // Already read (including current word) - white/normal
              style = { color: 'var(--color-text)', opacity: 1 }
            } else if (localDistance <= HIGHLIGHT_WIDTH) {
              // Upcoming highlight zone - primary color fading to secondary
              const t = (localDistance - 1) / HIGHLIGHT_WIDTH
              style = {
                color: `color-mix(in srgb, var(--color-primary) ${Math.round((1 - t) * 100)}%, var(--color-text-secondary))`,
                opacity: 1,
              }
            } else {
              // Not yet read - dimmed
              style = { color: 'var(--color-text-secondary)', opacity: 0.6 }
            }

            return (
              <span
                key={globalIndex}
                style={{
                  color: style.color,
                  opacity: style.opacity,
                  transition:
                    'color 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)',
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
        style={{ height: '280px' }}
      >
        <div className="pb-16">
          {words.map((word, index) => {
            const isActive = index === currentWordIndex
            const style = getWordStyle(index)

            return (
              <span
                key={index}
                ref={isActive ? activeWordRef : null}
                style={{
                  color: style.color,
                  opacity: style.opacity,
                  transition:
                    'color 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)',
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
