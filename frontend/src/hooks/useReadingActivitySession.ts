import { useCallback, useEffect, useRef } from 'react'
import type { Mode, ActivitySessionContext } from '../types/reading'
import type { Text } from '../types/database'
import {
  logUserActivity,
  logUserActivityOnUnload,
} from '../services/logUserActivity'
import { useAuth } from './useAuth'
import {
  clearReadingActivitySession,
  loadReadingActivitySession,
  upsertReadingActivitySession,
} from '../utils/readingActivityStorage'

export type UseReadingActivitySessionParams = {
  currentText: Text
  context: ActivitySessionContext
  readingComplete: boolean
}

export type UseReadingActivitySessionResult = {
  handlePositionChange: (wordIndex: number) => void
}

export const useReadingActivitySession = (
  params: UseReadingActivitySessionParams
): UseReadingActivitySessionResult => {
  const { currentText, context, readingComplete } = params
  const startTimeRef = useRef<string | null>(null)
  const hasLoggedCompleteRef = useRef(false)
  const hasLoggedLeaveRef = useRef(false)
  const pendingStartIndexRef = useRef<number | null>(null)
  const { session, user } = useAuth()
  const accessTokenRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    accessTokenRef.current = session?.access_token ?? null
    userIdRef.current = user?.id ?? null
  }, [session, user])

  useEffect(() => {
    hasLoggedCompleteRef.current = false
    hasLoggedLeaveRef.current = false
  }, [currentText.id])

  useEffect(() => {
    const existing = loadReadingActivitySession()
    if (existing?.textId === currentText.id) {
      if (
        context.mode !== 'adaptive' &&
        (existing.mode !== context.mode || !existing.started)
      ) {
        startTimeRef.current = null
        pendingStartIndexRef.current = context.readingPosition
        upsertReadingActivitySession({
          textId: currentText.id,
          startTime: null,
          started: false,
          wpm: context.wpm,
          mode: context.mode,
          progressIndex: context.readingPosition,
        })
        return
      }

      startTimeRef.current = existing.startTime
      const updates: Partial<{
        wpm: number
        mode: Mode
        progressIndex: number
      }> = {}
      if (
        existing.wpm !== context.wpm &&
        (!existing.started || existing.mode === 'adaptive')
      ) {
        updates.wpm = context.wpm
      }
      if (existing.mode !== context.mode) {
        updates.mode = context.mode
      }
      if (existing.progressIndex !== context.readingPosition) {
        updates.progressIndex = context.readingPosition
      }
      if (Object.keys(updates).length > 0) {
        upsertReadingActivitySession(updates)
      }
    } else {
      startTimeRef.current = null
      pendingStartIndexRef.current = context.readingPosition
      upsertReadingActivitySession({
        textId: currentText.id,
        startTime: null,
        started: false,
        wpm: context.wpm,
        mode: context.mode,
        progressIndex: context.readingPosition,
      })
    }

    if (
      context.readingPosition > 0 &&
      !startTimeRef.current &&
      context.readingPosition !== pendingStartIndexRef.current
    ) {
      const startTime = new Date().toISOString()
      startTimeRef.current = startTime
      pendingStartIndexRef.current = null
      upsertReadingActivitySession({
        textId: currentText.id,
        startTime,
        started: true,
        wpm: context.wpm,
        mode: context.mode,
        progressIndex: context.readingPosition,
      })
    }
  }, [currentText.id, context.readingPosition, context.wpm, context.mode])

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

      logUserActivityOnUnload(
        {
          textId: activitySession.textId,
          wpm: activitySession.wpm ?? context.wpm,
          startTime: activitySession.startTime,
          endTime: new Date().toISOString(),
          mode: activitySession.mode ?? context.mode,
          progressIndex:
            activitySession.progressIndex ?? context.readingPosition,
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
  }, [context.wpm, context.mode, context.readingPosition])

  useEffect(() => {
    if (!readingComplete || hasLoggedCompleteRef.current) return
    hasLoggedCompleteRef.current = true

    const activitySession = loadReadingActivitySession()
    clearReadingActivitySession()

    void logUserActivity({
      textId: currentText.id,
      wpm: activitySession?.wpm ?? context.wpm,
      startTime: startTimeRef.current ?? new Date().toISOString(),
      endTime: new Date().toISOString(),
      mode: context.mode,
      progressIndex: activitySession?.progressIndex ?? context.readingPosition,
    })
  }, [
    readingComplete,
    context.wpm,
    currentText.id,
    context.mode,
    context.readingPosition,
  ])

  useEffect(() => {
    const activitySession = loadReadingActivitySession()
    if (!activitySession?.started || activitySession.mode === 'adaptive') return
    if (activitySession.wpm === context.wpm) return

    const now = new Date().toISOString()
    void logUserActivity({
      textId: activitySession.textId,
      wpm: activitySession.wpm ?? context.wpm,
      startTime: activitySession.startTime ?? now,
      endTime: now,
      mode: activitySession.mode ?? context.mode,
      progressIndex: activitySession.progressIndex ?? context.readingPosition,
    })

    upsertReadingActivitySession({
      textId: activitySession.textId,
      startTime: now,
      started: true,
      wpm: context.wpm,
      mode: activitySession.mode ?? context.mode,
      progressIndex: context.readingPosition,
    })
  }, [context.wpm, context.mode, context.readingPosition])

  const handlePositionChange = useCallback(
    (wordIndex: number): void => {
      context.setReadingPosition(wordIndex)

      if (
        wordIndex > 0 &&
        !startTimeRef.current &&
        wordIndex !== pendingStartIndexRef.current
      ) {
        const startTime = new Date().toISOString()
        startTimeRef.current = startTime
        pendingStartIndexRef.current = null
        upsertReadingActivitySession({
          textId: currentText.id,
          startTime,
          started: true,
          wpm: context.wpm,
          mode: context.mode,
          progressIndex: wordIndex,
        })
      }
    },
    [context, currentText.id]
  )

  return { handlePositionChange }
}
