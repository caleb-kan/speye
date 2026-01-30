import { useEffect } from 'react'
import { TextDisplay } from './TextDisplay'
import { ReadingControls } from './ReadingControls'
import { useReader } from '../hooks/useReader'
import type { Scrolling } from '../types/reading'
import { Resizable } from './Resizable'
import { ExternalLink } from 'lucide-react'

type ReaderProps = {
  title: string | null
  text: string
  source: string | null
  wpm: number
  scrolling: Scrolling
  blurEnabled: boolean
  onNewText: () => void
  disabled?: boolean
  textWidthPercent: number
  onTextWidthChange: (percent: number) => void
  visibleLines: number
  onComplete?: (isComplete: boolean) => void
}

export function Reader({
  title,
  text,
  source,
  wpm,
  scrolling,
  blurEnabled,
  onNewText,
  disabled = false,
  textWidthPercent,
  onTextWidthChange,
  visibleLines,
  onComplete,
}: ReaderProps) {
  const {
    currentWordIndex,
    isPlaying,
    isComplete,
    totalWords,
    progress,
    togglePlayPause,
    restart,
    hasText,
  } = useReader({ text, wpm, disabled })

  useEffect(() => {
    if (onComplete) {
      onComplete(isComplete)
    }
  }, [isComplete, onComplete])

  if (!hasText) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="mx-auto w-full h-48 flex items-center justify-center text-center text-primary">
          <p>
            No text available for the selected filters.
            <br />
            Try adjusting complexity or fiction settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Optional Text Title */}
      {title && (
        <div>
          {/* Clickable link redirecting to source */}
          <h2 className="text-2xl font-semibold mb-2 text-center">
            {source ? (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                <div className="flex items-center justify-center gap-2">
                  {title}
                  <ExternalLink />
                </div>
              </a>
            ) : (
              title
            )}
          </h2>

          {/* Spacer */}
          <div className="h-10 shrink-0" />
        </div>
      )}

      {/* Text Display */}
      <Resizable
        widthPercent={textWidthPercent}
        onWidthChange={onTextWidthChange}
      >
        <TextDisplay
          text={text}
          currentWordIndex={currentWordIndex}
          isPlaying={isPlaying}
          scrolling={scrolling}
          blurEnabled={blurEnabled}
          wpm={wpm}
          visibleLines={visibleLines}
        />
      </Resizable>

      {/* Spacer */}
      <div className="h-10 shrink-0" />

      {/* Controls */}
      <ReadingControls
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onRestart={restart}
        onNewText={onNewText}
        progress={progress}
        currentWord={currentWordIndex + 1}
        totalWords={totalWords}
        disabled={disabled}
      />
    </div>
  )
}
