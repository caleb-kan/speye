import { useState, useMemo } from 'react'
import { RsvpReader } from './RsvpReader'
import { StartQuizButton } from '../StartQuizButton'
import type { ActivitySessionContext } from '../../types/reading'
import type { Text } from '../../types/database'
import { useReadingActivitySession } from '../../hooks/useReadingActivitySession'

type RsvpReadingSessionProps = {
  currentText: Text
  modeTimestamp?: number
  wpm: number
  phraseSize: number
  visibleLines: number
  readingPosition: number
  onPositionChange: (position: number) => void
  inputBlocking: boolean
  onNewText: () => void
  isSummary?: boolean
}

export function RsvpReadingSession({
  currentText,
  modeTimestamp,
  wpm,
  phraseSize,
  visibleLines,
  readingPosition,
  onPositionChange,
  inputBlocking,
  onNewText,
  isSummary,
}: RsvpReadingSessionProps) {
  const [readingComplete, setReadingComplete] = useState(false)
  const [triggerQuiz, setTriggerQuiz] = useState(false)
  const [quizDismissed, setQuizDismissed] = useState(false)

  const context = useMemo<ActivitySessionContext>(
    () => ({
      wpm,
      mode: 'rsvp',
      readingPosition,
      setReadingPosition: onPositionChange,
    }),
    [wpm, readingPosition, onPositionChange]
  )

  const { handlePositionChange } = useReadingActivitySession({
    currentText,
    context,
    readingComplete,
  })

  return (
    <div className="relative flex-1 flex flex-col w-full min-h-0 overflow-hidden">
      <RsvpReader
        key={`${currentText.id}-${modeTimestamp ?? ''}`}
        title={currentText.title}
        text={currentText.content}
        source={currentText.source}
        wpm={wpm}
        phraseSize={phraseSize}
        onNewText={onNewText}
        disabled={inputBlocking}
        visibleLines={visibleLines}
        onComplete={setReadingComplete}
        initialWordIndex={readingPosition}
        onPositionChange={handlePositionChange}
        showMiniQuiz={quizDismissed}
        onStartQuiz={() => setTriggerQuiz(true)}
        isSummary={isSummary}
      />

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
    </div>
  )
}
