import { useCallback, useEffect, useRef, useState } from 'react'
import { AdaptiveReader } from './AdaptiveReader'
import { StartQuizButton } from '../StartQuizButton'
import type { Text } from '../../types/database'
import {
  logUserActivity,
  logUserActivityOnUnload,
} from '../../services/logUserActivity'
import { useAuth } from '../../hooks/useAuth'
import {
  isReadingActivityOwner,
  loadReadingActivitySession,
  rotateReadingActivitySession,
  upsertReadingActivitySession,
} from '../../utils/readingActivityStorage'
import { useSectionQuiz } from '../../hooks/useSectionQuiz'

type AdaptiveReadingSessionProps = {
  currentText: Text
  onNewText: () => void
  wpm: number
  initialWordIndex?: number
  onPositionChange?: (wordIndex: number) => void
  onCalculatedWpmChange?: (wpm: number) => void
  adaptiveSessionWpm?: number | null
  isSummary?: boolean
  hideNewText?: boolean
}

export function AdaptiveReadingSession({
  currentText,
  onNewText,
  wpm,
  initialWordIndex = 0,
  onPositionChange,
  onCalculatedWpmChange,
  adaptiveSessionWpm,
  isSummary,
  hideNewText,
}: AdaptiveReadingSessionProps) {
  const [readingComplete, setReadingComplete] = useState(false)
  const [triggerQuiz, setTriggerQuiz] = useState(false)
  const [quizDismissed, setQuizDismissed] = useState(false)
  const [triggerSectionQuiz, setTriggerSectionQuiz] = useState(false)

  const startTimeRef = useRef<string | null>(null)
  const activityIdRef = useRef<string | null>(null)
  const readingSessionIdRef = useRef<string | null>(null)
  const [readingSessionId, setReadingSessionId] = useState<string | null>(null)
  const hasLoggedCompleteRef = useRef(false)
  const hasLoggedLeaveRef = useRef(false)
  const { session, user } = useAuth()
  const ownerId = user?.id ?? null
  const accessTokenRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const getActivityId = useCallback(
    () =>
      isReadingActivityOwner(ownerId)
        ? (activityIdRef.current ?? undefined)
        : undefined,
    [ownerId]
  )

  useEffect(() => {
    accessTokenRef.current = session?.access_token ?? null
    userIdRef.current = user?.id ?? null
  }, [session, user])

  useEffect(() => {
    activityIdRef.current = null
    readingSessionIdRef.current = null
    hasLoggedCompleteRef.current = false
    hasLoggedLeaveRef.current = false
  }, [ownerId, currentText.id])

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
  } = useSectionQuiz(currentText, getActivityId, readingSessionId)

  useEffect(() => {
    if (readingComplete && hasLoggedCompleteRef.current) return
    const existing = loadReadingActivitySession(ownerId)
    if (existing?.textId === currentText.id) {
      readingSessionIdRef.current =
        existing.readingSessionId ??
        readingSessionIdRef.current ??
        crypto.randomUUID()
    } else if (!readingSessionIdRef.current || hasLoggedCompleteRef.current) {
      readingSessionIdRef.current = crypto.randomUUID()
    }
    if (readingSessionId !== readingSessionIdRef.current) {
      // Expose the restored attempt identity to section quiz persistence.
      setReadingSessionId(readingSessionIdRef.current)
    }
    if (
      existing?.textId === currentText.id &&
      (existing.mode === 'adaptive' || existing.completed)
    ) {
      activityIdRef.current =
        existing.activityId ?? activityIdRef.current ?? crypto.randomUUID()
    } else if (
      !activityIdRef.current ||
      existing ||
      hasLoggedCompleteRef.current
    ) {
      activityIdRef.current = crypto.randomUUID()
    }
    if (existing?.textId === currentText.id && existing.completed) {
      hasLoggedCompleteRef.current = true
      startTimeRef.current = null
      return
    }
    if (existing?.textId === currentText.id) {
      if (existing.mode !== 'adaptive') {
        startTimeRef.current = null
        upsertReadingActivitySession(
          {
            activityId: activityIdRef.current,
            readingSessionId: readingSessionIdRef.current,
            textId: currentText.id,
            startTime: null,
            started: false,
            wpm,
            mode: 'adaptive',
            progressIndex: initialWordIndex,
          },
          ownerId
        )
      } else {
        startTimeRef.current = existing.startTime
        const updates: Partial<{ wpm: number; progressIndex: number }> = {}
        if (existing.wpm !== wpm) updates.wpm = wpm
        if (existing.progressIndex !== initialWordIndex)
          updates.progressIndex = initialWordIndex
        if (
          Object.keys(updates).length > 0 ||
          existing.activityId !== activityIdRef.current ||
          existing.readingSessionId !== readingSessionIdRef.current
        ) {
          upsertReadingActivitySession(
            {
              ...updates,
              activityId: activityIdRef.current,
              readingSessionId: readingSessionIdRef.current,
            },
            ownerId
          )
        }
      }
    } else {
      startTimeRef.current = null
      upsertReadingActivitySession(
        {
          activityId: activityIdRef.current,
          readingSessionId: readingSessionIdRef.current,
          textId: currentText.id,
          startTime: null,
          started: false,
          wpm,
          mode: 'adaptive',
          progressIndex: initialWordIndex,
        },
        ownerId
      )
    }

    if (initialWordIndex > 0 && !startTimeRef.current) {
      const startTime = new Date().toISOString()
      startTimeRef.current = startTime
      upsertReadingActivitySession(
        {
          activityId: activityIdRef.current,
          readingSessionId: readingSessionIdRef.current,
          textId: currentText.id,
          startTime,
          started: true,
          wpm,
          mode: 'adaptive',
          progressIndex: initialWordIndex,
        },
        ownerId
      )
    }
  }, [
    ownerId,
    readingComplete,
    currentText.id,
    initialWordIndex,
    wpm,
    readingSessionId,
  ])

  useEffect(() => {
    const handlePageLeave = () => {
      if (hasLoggedLeaveRef.current) return
      const activitySession = loadReadingActivitySession(ownerId)
      if (
        !activitySession?.started ||
        !activitySession.textId ||
        !activitySession.startTime
      )
        return

      hasLoggedLeaveRef.current = true

      const logWpm = adaptiveSessionWpm
        ? Math.round(adaptiveSessionWpm)
        : (activitySession.wpm ?? wpm)

      logUserActivityOnUnload(
        {
          id: activitySession.activityId ?? activityIdRef.current ?? undefined,
          textId: activitySession.textId,
          wpm: logWpm,
          startTime: activitySession.startTime,
          endTime: new Date().toISOString(),
          mode: activitySession.mode ?? 'adaptive',
          progressIndex: activitySession.progressIndex ?? initialWordIndex,
        },
        accessTokenRef.current,
        userIdRef.current
      )
      activityIdRef.current =
        rotateReadingActivitySession(ownerId)?.activityId ?? null
      startTimeRef.current = null
    }
    const handlePageShow = () => {
      hasLoggedLeaveRef.current = false
    }

    window.addEventListener('beforeunload', handlePageLeave)
    window.addEventListener('pagehide', handlePageLeave)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.removeEventListener('beforeunload', handlePageLeave)
      window.removeEventListener('pagehide', handlePageLeave)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [ownerId, wpm, adaptiveSessionWpm, initialWordIndex])

  useEffect(() => {
    if (!readingComplete) {
      const existing = loadReadingActivitySession(ownerId)
      hasLoggedCompleteRef.current =
        existing?.textId === currentText.id && existing.completed
      return
    }
    if (hasLoggedCompleteRef.current || !isReadingActivityOwner(ownerId)) return
    hasLoggedCompleteRef.current = true

    const activitySession = loadReadingActivitySession(ownerId)
    // Retain quiz identity while making the completed record ineligible for logging.
    upsertReadingActivitySession(
      {
        activityId: activitySession?.activityId ?? activityIdRef.current,
        readingSessionId: readingSessionIdRef.current,
        textId: currentText.id,
        completed: true,
        started: false,
        startTime: null,
        progressIndex: activitySession?.progressIndex ?? initialWordIndex,
        mode: 'adaptive',
        wpm: activitySession?.wpm ?? wpm,
      },
      ownerId
    )

    const logWpm = adaptiveSessionWpm
      ? Math.round(adaptiveSessionWpm)
      : (activitySession?.wpm ?? wpm)

    void logUserActivity(
      {
        id: activitySession?.activityId ?? activityIdRef.current ?? undefined,
        textId: currentText.id,
        wpm: logWpm,
        startTime: startTimeRef.current ?? new Date().toISOString(),
        endTime: new Date().toISOString(),
        mode: 'adaptive',
        progressIndex: activitySession?.progressIndex ?? initialWordIndex,
      },
      ownerId
    )
  }, [
    ownerId,
    readingComplete,
    currentText.id,
    wpm,
    adaptiveSessionWpm,
    initialWordIndex,
  ])

  const handlePositionChange = (wordIndex: number) => {
    if (!isReadingActivityOwner(ownerId)) return
    const existing = loadReadingActivitySession(ownerId)
    if (existing?.completed) {
      onPositionChange?.(wordIndex)
      return
    }
    if (existing?.progressIndex !== wordIndex) {
      hasLoggedLeaveRef.current = false
    }
    onPositionChange?.(wordIndex)

    if (wordIndex > 0 && !startTimeRef.current) {
      const startTime = new Date().toISOString()
      startTimeRef.current = startTime
      upsertReadingActivitySession(
        {
          activityId: activityIdRef.current,
          readingSessionId: readingSessionIdRef.current,
          textId: currentText.id,
          startTime,
          started: true,
          wpm,
          mode: 'adaptive',
          progressIndex: wordIndex,
        },
        ownerId
      )
    }
  }

  const handleRestart = () => {
    if (!isReadingActivityOwner(ownerId)) return
    setReadingComplete(false)
    hasLoggedCompleteRef.current = false
    hasLoggedLeaveRef.current = false
    activityIdRef.current = crypto.randomUUID()
    readingSessionIdRef.current = crypto.randomUUID()
    setReadingSessionId(readingSessionIdRef.current)
    startTimeRef.current = null
    upsertReadingActivitySession(
      {
        activityId: activityIdRef.current,
        readingSessionId: readingSessionIdRef.current,
        textId: currentText.id,
        completed: false,
        started: false,
        startTime: null,
        progressIndex: 0,
        mode: 'adaptive',
        wpm,
      },
      ownerId
    )
    onPositionChange?.(0)
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden pb-20">
      <AdaptiveReader
        title={currentText.title}
        text={currentText.content}
        source={currentText.source}
        onNewText={onNewText}
        onComplete={setReadingComplete}
        initialWordIndex={initialWordIndex}
        onPositionChange={handlePositionChange}
        onRestart={handleRestart}
        onCalculatedWpmChange={onCalculatedWpmChange}
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

      {/* Section quiz overlay (sectional texts only) */}
      {isSectional && (
        <StartQuizButton
          getActivityId={getActivityId}
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
          getActivityId={getActivityId}
          textId={currentText.id}
          ownerId={currentText.owner_id}
          readingComplete={readingComplete}
          dismissed={quizDismissed}
          onDismiss={() => setQuizDismissed(true)}
          forceOpen={triggerQuiz}
          onOpenStateChange={setTriggerQuiz}
          className="items-center justify-end pb-64"
        />
      )}
    </div>
  )
}
