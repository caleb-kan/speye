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
            const isActive = globalIndex === currentWordIndex
            const isPast = globalIndex < currentWordIndex

            return (
              <span
                key={globalIndex}
                className={`transition-colors duration-100 ${
                  isActive
                    ? 'text-[var(--color-primary)] font-semibold'
                    : isPast
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {word}{' '}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  // Dynamic mode (original behavior)
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
            const isPast = index < currentWordIndex

            return (
              <span
                key={index}
                ref={isActive ? activeWordRef : null}
                className={`transition-colors duration-100 ${
                  isActive
                    ? 'text-[var(--color-primary)] font-semibold'
                    : isPast
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-secondary)]'
                }`}
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
