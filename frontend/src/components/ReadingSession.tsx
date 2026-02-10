import { useState } from 'react'
import { Reader } from './Reader'
import { StartQuizButton } from './StartQuizButton'
import type { ReadingContext } from '../types/reading'
import type { Text } from '../types/database'
import { useReadingActivitySession } from '../hooks/useReadingActivitySession'

type ReadingSessionProps = {
  currentText: Text
  modeTimestamp?: number
  context: ReadingContext
  onNewText: () => void
}

export function ReadingSession({
  currentText,
  modeTimestamp,
  context,
  onNewText,
}: ReadingSessionProps) {
  const [readingComplete, setReadingComplete] = useState(false)
  const [triggerQuiz, setTriggerQuiz] = useState(false)
  const [quizDismissed, setQuizDismissed] = useState(false)
  const { handlePositionChange } = useReadingActivitySession({
    currentText,
    context,
    readingComplete,
  })

  return (
    <div className="relative flex-1 flex flex-col w-full h-full overflow-hidden pb-20">
      <Reader
        key={`${currentText.id}-${modeTimestamp ?? ''}`}
        title={currentText.title}
        text={currentText.content}
        source={currentText.source}
        wpm={context.wpm}
        scrolling={context.scrolling}
        blurEnabled={context.blurEnabled || (readingComplete && !quizDismissed)}
        onNewText={onNewText}
        disabled={context.inputBlocking}
        textWidthPercent={context.textWidthPercent}
        onTextWidthChange={context.onTextWidthChange}
        visibleLines={context.visibleLines}
        onComplete={setReadingComplete}
        initialWordIndex={context.readingPosition}
        onPositionChange={handlePositionChange}
        showMiniQuiz={quizDismissed}
        onStartQuiz={() => setTriggerQuiz(true)}
      />

      <StartQuizButton
        textId={currentText.id}
        readingComplete={readingComplete}
        dismissed={quizDismissed}
        onDismiss={() => setQuizDismissed(true)}
        forceOpen={triggerQuiz}
        onOpenStateChange={setTriggerQuiz}
        className="items-center justify-center pb-42"
      />
    </div>
  )
}
