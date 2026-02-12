import { useEffect, useRef, useState } from 'react'
import { AdaptiveReader } from './AdaptiveReader'
import { StartQuizButton } from '../StartQuizButton'
import type { Text } from '../../types'
import {
  logUserActivity,
  logUserActivityOnUnload,
} from '../../services/logUserActivity'
import { useAuth } from '../../hooks/useAuth'
import {
  clearReadingActivitySession,
  loadReadingActivitySession,
  upsertReadingActivitySession,
} from '../../utils/readingActivityStorage'

type AdaptiveReadingSessionProps = {
  currentText: Text
  onNewText: () => void
  wpm: number
  initialWordIndex?: number
  onPositionChange?: (wordIndex: number) => void
  onCalculatedWpmChange?: (wpm: number) => void
  adaptiveSessionWpm?: number | null
  isSummary?: boolean
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
}: AdaptiveReadingSessionProps) {
  const [readingComplete, setReadingComplete] = useState(false)
  const [triggerQuiz, setTriggerQuiz] = useState(false)
  const [quizDismissed, setQuizDismissed] = useState(false)
  const startTimeRef = useRef<string | null>(null)
  const hasLoggedCompleteRef = useRef(false)
  const hasLoggedLeaveRef = useRef(false)
  const { session, user } = useAuth()
  const accessTokenRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    accessTokenRef.current = session?.access_token ?? null
    userIdRef.current = user?.id ?? null
  }, [session, user])

  // Reset log flags only when text changes to prevent double-logging
  useEffect(() => {
    hasLoggedCompleteRef.current = false
    hasLoggedLeaveRef.current = false
  }, [currentText.id])

  useEffect(() => {
    const existing = loadReadingActivitySession()
    if (existing?.textId === currentText.id) {
      if (existing.mode !== 'adaptive') {
        startTimeRef.current = null
        upsertReadingActivitySession({
          textId: currentText.id,
          startTime: null,
          started: false,
          wpm,
          mode: 'adaptive',
          progressIndex: initialWordIndex,
        })
      } else {
        startTimeRef.current = existing.startTime
        const updates: Partial<{ wpm: number; progressIndex: number }> = {}
        if (existing.wpm !== wpm) updates.wpm = wpm
        if (existing.progressIndex !== initialWordIndex)
          updates.progressIndex = initialWordIndex
        if (Object.keys(updates).length > 0) {
          upsertReadingActivitySession(updates)
        }
      }
    } else {
      startTimeRef.current = null
      upsertReadingActivitySession({
        textId: currentText.id,
        startTime: null,
        started: false,
        wpm,
        mode: 'adaptive',
        progressIndex: initialWordIndex,
      })
    }

    if (initialWordIndex > 0 && !startTimeRef.current) {
      const startTime = new Date().toISOString()
      startTimeRef.current = startTime
      upsertReadingActivitySession({
        textId: currentText.id,
        startTime,
        started: true,
        wpm,
        mode: 'adaptive',
        progressIndex: initialWordIndex,
      })
    }
  }, [currentText.id, initialWordIndex, wpm])

  useEffect(() => {
    const handlePageLeave = () => {
      if (hasLoggedLeaveRef.current) return
      const activitySession = loadReadingActivitySession()
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
    }

    window.addEventListener('beforeunload', handlePageLeave)
    window.addEventListener('pagehide', handlePageLeave)

    return () => {
      window.removeEventListener('beforeunload', handlePageLeave)
      window.removeEventListener('pagehide', handlePageLeave)
    }
  }, [wpm, adaptiveSessionWpm, initialWordIndex])

  useEffect(() => {
    if (!readingComplete || hasLoggedCompleteRef.current) return
    hasLoggedCompleteRef.current = true

    const activitySession = loadReadingActivitySession()
    // Clear session immediately to prevent double-logging from Navbar
    clearReadingActivitySession()

    const logWpm = adaptiveSessionWpm
      ? Math.round(adaptiveSessionWpm)
      : (activitySession?.wpm ?? wpm)

    void logUserActivity({
      textId: currentText.id,
      wpm: logWpm,
      startTime: startTimeRef.current ?? new Date().toISOString(),
      endTime: new Date().toISOString(),
      mode: 'adaptive',
      progressIndex: activitySession?.progressIndex ?? initialWordIndex,
    })
  }, [
    readingComplete,
    currentText.id,
    wpm,
    adaptiveSessionWpm,
    initialWordIndex,
  ])

  const handlePositionChange = (wordIndex: number) => {
    onPositionChange?.(wordIndex)

    if (wordIndex > 0 && !startTimeRef.current) {
      const startTime = new Date().toISOString()
      startTimeRef.current = startTime
      upsertReadingActivitySession({
        textId: currentText.id,
        startTime,
        started: true,
        wpm,
        mode: 'adaptive',
        progressIndex: wordIndex,
      })
    }
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
        onCalculatedWpmChange={onCalculatedWpmChange}
        showMiniQuiz={quizDismissed}
        onStartQuiz={() => setTriggerQuiz(true)}
        isSummary={isSummary}
      />

      <StartQuizButton
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
