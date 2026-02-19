import { useEffect, useRef } from 'react'
import { RsvpDisplay } from './RsvpDisplay'
import { ReadingControls } from '../ReadingControls'
import { useRsvpReader } from '../../hooks/useRsvpReader'

type RsvpReaderProps = {
  title: string | null
  text: string
  source: string | null
  wpm: number
  phraseSize: number
  onNewText: () => void
  disabled?: boolean
  visibleLines: number
  onComplete?: (isComplete: boolean) => void
  initialWordIndex?: number
  onPositionChange?: (wordIndex: number) => void
  showMiniQuiz?: boolean
  onStartQuiz?: () => void
  isSummary?: boolean
}

export function RsvpReader({
  title,
  text,
  source,
  wpm,
  phraseSize,
  onNewText,
  disabled = false,
  visibleLines,
  onComplete,
  initialWordIndex = 0,
  onPositionChange,
  showMiniQuiz,
  onStartQuiz,
  isSummary,
}: RsvpReaderProps) {
  const {
    currentWordIndex,
    isPlaying,
    isComplete,
    totalWords,
    progress,
    togglePlayPause,
    restart,
    hasText,
    phrases,
    currentPhraseIndex,
  } = useRsvpReader({ text, wpm, phraseSize, disabled, initialWordIndex })

  const onPositionChangeRef = useRef(onPositionChange)
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange
  }, [onPositionChange])

  useEffect(() => {
    onPositionChangeRef.current?.(currentWordIndex)
  }, [currentWordIndex])

  useEffect(() => {
    if (onComplete) {
      onComplete(isComplete)
    }
  }, [isComplete, onComplete])

  if (!hasText) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full h-48 flex items-center justify-center text-center text-primary">
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
    <div className="flex-1 flex items-center justify-center min-h-0 my-4">
      <RsvpDisplay
        title={title}
        source={source}
        isSummary={isSummary}
        phrases={phrases}
        currentPhraseIndex={currentPhraseIndex}
        visibleLines={visibleLines}
      >
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
      </RsvpDisplay>
    </div>
  )
}
