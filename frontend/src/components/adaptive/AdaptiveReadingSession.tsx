import { useState } from 'react'
import { AdaptiveReader } from './AdaptiveReader'
import { StartQuizButton } from '../StartQuizButton'
import type { Text } from '../../types'

type AdaptiveReadingSessionProps = {
  currentText: Text
  onNewText: () => void
  wpm: number
  initialWordIndex?: number
  onPositionChange?: (wordIndex: number) => void
}

export function AdaptiveReadingSession({
  currentText,
  onNewText,
  wpm,
  initialWordIndex = 0,
  onPositionChange,
}: AdaptiveReadingSessionProps) {
  const [readingComplete, setReadingComplete] = useState(false)
  const [triggerQuiz, setTriggerQuiz] = useState(false)
  const [quizDismissed, setQuizDismissed] = useState(false)

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden pb-20">
      <AdaptiveReader
        title={currentText.title}
        text={currentText.content}
        source={currentText.source}
        onNewText={onNewText}
        onComplete={setReadingComplete}
        initialWordIndex={initialWordIndex}
        onPositionChange={onPositionChange}
        showMiniQuiz={quizDismissed}
        onStartQuiz={() => setTriggerQuiz(true)}
      />

      <StartQuizButton
        wpm={wpm}
        textId={currentText.id}
        readingComplete={readingComplete}
        dismissed={quizDismissed}
        onDismiss={() => setQuizDismissed(true)}
        forceOpen={triggerQuiz}
        onOpenStateChange={setTriggerQuiz}
        className="items-center justify-end pb-64"
      />
    </div>
  )
}
