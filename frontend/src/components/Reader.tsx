import { useEffect, useRef, useCallback } from 'react'
import { TextDisplay } from './TextDisplay'
import { ReadingControls } from './ReadingControls'
import { TextTitle } from './TextTitle'
import { useReader } from '../hooks/useReader'
import { useArrowNavigation } from '../hooks/useArrowNavigation'
import type { Scrolling } from '../types/reading'
import { Resizable } from './Resizable'
import { ARROW_KEY_JUMP_WORDS } from '../constants/textDisplay'

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
  initialWordIndex?: number
  onPositionChange?: (wordIndex: number) => void
  showMiniQuiz?: boolean
  onStartQuiz?: () => void
  isSummary?: boolean
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
  initialWordIndex = 0,
  onPositionChange,
  showMiniQuiz,
  onStartQuiz,
  isSummary,
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
    jumpForward,
    jumpBack,
  } = useReader({ text, wpm, disabled, initialWordIndex })

  const handleForward = useCallback(() => {
    jumpForward(ARROW_KEY_JUMP_WORDS)
  }, [jumpForward])

  const handleBack = useCallback(() => {
    jumpBack(ARROW_KEY_JUMP_WORDS)
  }, [jumpBack])

  useArrowNavigation({
    enabled: hasText && !disabled,
    onForward: handleForward,
    onBack: handleBack,
  })

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
          <TextTitle title={title} source={source} isSummary={isSummary} />
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
