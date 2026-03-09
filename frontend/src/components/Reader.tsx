import { useEffect, useRef, useCallback } from 'react'
import { TextDisplay } from './TextDisplay'
import { SectionalTextDisplay } from './SectionalTextDisplay'
import { ReadingControls } from './ReadingControls'
import { TextTitle } from './TextTitle'
import { useReader } from '../hooks/useReader'
import { useArrowNavigation } from '../hooks/useArrowNavigation'
import type { Scrolling } from '../types/reading'
import { Resizable } from './Resizable'
import { ShortcutHints } from './ShortcutHints'
import { ARROW_KEY_JUMP_WORDS } from '../constants/textDisplay'
import type { SectionData } from '../types/database'

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
  sectional?: boolean
  section_content?: SectionData[] | null
  onSectionComplete?: (sectionIndex: number) => void
  onSectionIndexChange?: (sectionIndex: number) => void
  /** Sections where the quiz was actually answered (controls dot colour) */
  quizzedSections?: Set<number>
  /** Total number of sections that have quizzes (for last-section status display) */
  totalSectionQuizCount?: number
  hideNewText?: boolean
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
  sectional = false,
  section_content = null,
  onSectionComplete,
  onSectionIndexChange,
  quizzedSections,
  totalSectionQuizCount,
  hideNewText = false,
}: ReaderProps) {
  const {
    currentWordIndex,
    isPlaying,
    isComplete,
    totalWords,
    progress,
    togglePlayPause,
    pause,
    restart,
    hasText,
    jumpForward,
    jumpBack,
    jumpToIndex,
  } = useReader({ text, wpm, disabled, initialWordIndex })

  const handleSectionComplete = useCallback(
    (sectionIndex: number) => {
      pause()
      onSectionComplete?.(sectionIndex)
    },
    [pause, onSectionComplete]
  )

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
      {title && (
        <div className="pt-8 pb-4">
          <TextTitle title={title} source={source} isSummary={isSummary} />
        </div>
      )}

      <div className="flex-1 w-full">
        {!disabled && <ShortcutHints />}
        {sectional && section_content ? (
          <SectionalTextDisplay
            sections={section_content}
            currentWordIndex={currentWordIndex}
            onWordIndexChange={jumpToIndex}
            onSectionComplete={handleSectionComplete}
            onSectionIndexChange={onSectionIndexChange}
            quizzedSections={quizzedSections}
            totalSectionQuizCount={totalSectionQuizCount}
          >
            {({ sectionText, sectionWordIndex }) => (
              <div className="flex items-center justify-center h-full">
                <Resizable
                  widthPercent={textWidthPercent}
                  onWidthChange={onTextWidthChange}
                >
                  <TextDisplay
                    text={sectionText}
                    currentWordIndex={sectionWordIndex}
                    isPlaying={isPlaying}
                    scrolling={scrolling}
                    blurEnabled={blurEnabled}
                    wpm={wpm}
                    visibleLines={visibleLines}
                  />
                </Resizable>
              </div>
            )}
          </SectionalTextDisplay>
        ) : (
          <div className="flex items-center justify-center h-full">
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
        )}
      </div>

      <div>
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
          hideProgress={sectional}
          hideNewText={hideNewText}
        />
      </div>
    </div>
  )
}
