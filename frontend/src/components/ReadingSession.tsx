import { useState } from 'react'
import { Reader } from './Reader'
import { StartQuizButton } from './StartQuizButton'
import type { ReadingContext } from '../types/reading'
import type { Text } from '../types/database'
import { useReadingActivitySession } from '../hooks/useReadingActivitySession'
import { useSectionQuiz } from '../hooks/useSectionQuiz'

type ReadingSessionProps = {
  currentText: Text
  modeTimestamp?: number
  context: ReadingContext
  onNewText: () => void
  isSummary?: boolean
  hideNewText?: boolean
}

export function ReadingSession({
  currentText,
  modeTimestamp,
  context,
  onNewText,
  isSummary,
  hideNewText,
}: ReadingSessionProps) {
  const [readingComplete, setReadingComplete] = useState(false)
  const [triggerQuiz, setTriggerQuiz] = useState(false)
  const [quizDismissed, setQuizDismissed] = useState(false)
  const [triggerSectionQuiz, setTriggerSectionQuiz] = useState(false)

  const { handlePositionChange } = useReadingActivitySession({
    currentText,
    context,
    readingComplete,
  })

  const {
    isSectional,
    questionSets,
    setCurrentSectionIndex,
    handleSectionComplete,
    handleSectionQuizFinish,
    handleSectionQuizDismiss,
    isSectionQuizActive,
    sectionQuestionSet,
    showSectionMiniQuiz,
    completedSectionQuizzes,
  } = useSectionQuiz(currentText)

  return (
    <div className="relative flex-1 flex flex-col w-full h-full overflow-hidden pb-20">
      <Reader
        key={`${currentText.id}-${modeTimestamp ?? ''}`}
        title={currentText.title}
        text={currentText.content}
        source={currentText.source}
        wpm={context.wpm}
        scrolling={context.scrolling}
        blurEnabled={
          context.blurEnabled ||
          (!isSectional && readingComplete && !quizDismissed)
        }
        onNewText={onNewText}
        disabled={context.inputBlocking}
        textWidthPercent={context.textWidthPercent}
        onTextWidthChange={context.onTextWidthChange}
        visibleLines={context.visibleLines}
        onComplete={setReadingComplete}
        initialWordIndex={context.readingPosition}
        onPositionChange={handlePositionChange}
        showMiniQuiz={isSectional ? showSectionMiniQuiz : quizDismissed}
        onStartQuiz={
          isSectional
            ? () => setTriggerSectionQuiz(true)
            : () => setTriggerQuiz(true)
        }
        isSummary={isSummary}
        sectional={currentText.sectional}
        section_content={currentText.section_content}
        onSectionComplete={isSectional ? handleSectionComplete : undefined}
        onSectionIndexChange={isSectional ? setCurrentSectionIndex : undefined}
        quizzedSections={isSectional ? completedSectionQuizzes : undefined}
        totalSectionQuizCount={isSectional ? questionSets.length : undefined}
        hideNewText={hideNewText}
      />

      {/* Section quiz overlay (sectional texts) */}
      {isSectional && (
        <StartQuizButton
          textId={currentText.id}
          ownerId={currentText.owner_id}
          readingComplete={isSectionQuizActive}
          dismissed={!isSectionQuizActive}
          onDismiss={handleSectionQuizDismiss}
          questionSet={sectionQuestionSet}
          onFinish={handleSectionQuizFinish}
          forceOpen={triggerSectionQuiz}
          onOpenStateChange={setTriggerSectionQuiz}
          className="items-center justify-center pb-42"
        />
      )}

      {/* Full text quiz overlay (non-sectional texts only) */}
      {!isSectional && (
        <StartQuizButton
          textId={currentText.id}
          ownerId={currentText.owner_id}
          readingComplete={readingComplete}
          dismissed={quizDismissed}
          onDismiss={() => setQuizDismissed(true)}
          forceOpen={triggerQuiz}
          onOpenStateChange={setTriggerQuiz}
          className="items-center justify-center pb-42"
        />
      )}
    </div>
  )
}
