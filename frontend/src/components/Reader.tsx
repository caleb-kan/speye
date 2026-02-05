import { useEffect } from 'react'
import { TextDisplay } from './TextDisplay'
import { ReadingControls } from './ReadingControls'
import { TextTitle } from './TextTitle'
import { useReader } from '../hooks/useReader'
import type { Scrolling } from '../types/reading'
import { Resizable } from './Resizable'

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
  showMiniQuiz?: boolean
  onStartQuiz?: () => void
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
  showMiniQuiz,
  onStartQuiz,
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
    <div className="flex flex-col flex-1 w-full">
      {/* Title with top padding to center between options bar and text */}
      {title && (
        <div className="pt-8">
          <TextTitle title={title} source={source} />
        </div>
      )}

      {/* Text display - flex-1 to fill space, centered within */}
      <div className="flex-1 flex items-center justify-center">
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
      </div>

      {/* Controls at bottom */}
      <div className="py-4">
        <ReadingControls
          isPlaying={isPlaying}
          onPlayPause={togglePlayPause}
          onRestart={restart}
          onNewText={onNewText}
          progress={progress}
          currentWord={currentWordIndex + 1}
          totalWords={totalWords}
          disabled={disabled}
          showMiniQuiz={showMiniQuiz}
          onStartQuiz={onStartQuiz}
        />
      </div>
    </div>
  )
}
