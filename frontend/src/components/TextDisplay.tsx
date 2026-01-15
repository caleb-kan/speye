import { useEffect, useRef } from 'react'

type TextDisplayProps = {
  text: string
  currentWordIndex: number
  isPlaying: boolean
}

export function TextDisplay({
  text,
  currentWordIndex,
  isPlaying,
}: TextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement>(null)

  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const isNearEnd = currentWordIndex >= words.length - 10

  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
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
  }, [currentWordIndex, isPlaying])

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
