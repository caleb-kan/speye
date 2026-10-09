import { useCallback, useEffect, useRef, useState } from 'react'
import type { Mode, ActivitySessionContext } from '../types/reading'
import type { Text } from '../types/database'
import {
  logUserActivity,
  logUserActivityOnUnload,
} from '../services/logUserActivity'
import { useAuth } from './useAuth'
import {
  isReadingActivityOwner,
  loadReadingActivitySession,
  rotateReadingActivitySession,
  upsertReadingActivitySession,
} from '../utils/readingActivityStorage'

export type UseReadingActivitySessionParams = {
  currentText: Text
  context: ActivitySessionContext
  readingComplete: boolean
}

export type UseReadingActivitySessionResult = {
  handlePositionChange: (wordIndex: number) => void
  handleRestart: () => void
  getActivityId: () => string | undefined
  readingSessionId: string | null
}

export const useReadingActivitySession = (
  params: UseReadingActivitySessionParams
): UseReadingActivitySessionResult => {
  const { currentText, context, readingComplete } = params
  const startTimeRef = useRef<string | null>(null)
  const activityIdRef = useRef<string | null>(null)
  const readingSessionIdRef = useRef<string | null>(null)
  const [readingSessionId, setReadingSessionId] = useState<string | null>(null)
  const hasLoggedCompleteRef = useRef(false)
  const hasLoggedLeaveRef = useRef(false)
  const pendingStartIndexRef = useRef<number | null>(null)
  const { session, user } = useAuth()
  const ownerId = user?.id ?? null
  const accessTokenRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)

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
      (existing.mode === context.mode || existing.completed)
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
      if (
        context.mode !== 'adaptive' &&
        (existing.mode !== context.mode || !existing.started)
      ) {
        startTimeRef.current = null
        pendingStartIndexRef.current = context.readingPosition
        upsertReadingActivitySession(
          {
            activityId: activityIdRef.current,
            readingSessionId: readingSessionIdRef.current,
            textId: currentText.id,
            startTime: null,
            started: false,
            wpm: context.wpm,
            mode: context.mode,
            progressIndex: context.readingPosition,
          },
          ownerId
        )
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
    } else {
      startTimeRef.current = null
      pendingStartIndexRef.current = context.readingPosition
      upsertReadingActivitySession(
        {
          activityId: activityIdRef.current,
          readingSessionId: readingSessionIdRef.current,
          textId: currentText.id,
          startTime: null,
          started: false,
          wpm: context.wpm,
          mode: context.mode,
          progressIndex: context.readingPosition,
        },
        ownerId
      )
    }

    if (
      context.readingPosition > 0 &&
      !startTimeRef.current &&
      context.readingPosition !== pendingStartIndexRef.current
    ) {
      const startTime = new Date().toISOString()
      startTimeRef.current = startTime
      pendingStartIndexRef.current = null
      upsertReadingActivitySession(
        {
          activityId: activityIdRef.current,
          readingSessionId: readingSessionIdRef.current,
          textId: currentText.id,
          startTime,
          started: true,
          wpm: context.wpm,
          mode: context.mode,
          progressIndex: context.readingPosition,
        },
        ownerId
      )
    }
  }, [
    ownerId,
    readingComplete,
    currentText.id,
    context.readingPosition,
    context.wpm,
    context.mode,
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

      logUserActivityOnUnload(
        {
          id: activitySession.activityId ?? activityIdRef.current ?? undefined,
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
      activityIdRef.current =
        rotateReadingActivitySession(ownerId)?.activityId ?? null
      startTimeRef.current = null
      pendingStartIndexRef.current = activitySession.progressIndex
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
  }, [ownerId, context.wpm, context.mode, context.readingPosition])

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
    upsertReadingActivitySession(
      {
        activityId: activitySession?.activityId ?? activityIdRef.current,
        readingSessionId: readingSessionIdRef.current,
        textId: currentText.id,
        completed: true,
        started: false,
        startTime: null,
        progressIndex:
          activitySession?.progressIndex ?? context.readingPosition,
        mode: context.mode,
        wpm: activitySession?.wpm ?? context.wpm,
      },
      ownerId
    )

    void logUserActivity(
      {
        id: activitySession?.activityId ?? activityIdRef.current ?? undefined,
        textId: currentText.id,
        wpm: activitySession?.wpm ?? context.wpm,
        startTime: startTimeRef.current ?? new Date().toISOString(),
        endTime: new Date().toISOString(),
        mode: context.mode,
        progressIndex:
          activitySession?.progressIndex ?? context.readingPosition,
      },
      ownerId
    )
  }, [
    ownerId,
    readingComplete,
    context.wpm,
    currentText.id,
    context.mode,
    context.readingPosition,
  ])

  useEffect(() => {
    const activitySession = loadReadingActivitySession(ownerId)
    if (!activitySession?.started || activitySession.mode === 'adaptive') return
    if (activitySession.wpm === context.wpm) return

    const now = new Date().toISOString()
    void logUserActivity(
      {
        id: activitySession.activityId ?? activityIdRef.current ?? undefined,
        textId: activitySession.textId,
        wpm: activitySession.wpm ?? context.wpm,
        startTime: activitySession.startTime ?? now,
        endTime: now,
        mode: activitySession.mode ?? context.mode,
        progressIndex: activitySession.progressIndex ?? context.readingPosition,
      },
      ownerId
    )

    activityIdRef.current = crypto.randomUUID()
    startTimeRef.current = now
    upsertReadingActivitySession(
      {
        activityId: activityIdRef.current,
        readingSessionId: readingSessionIdRef.current,
        textId: activitySession.textId,
        startTime: now,
        started: true,
        wpm: context.wpm,
        mode: activitySession.mode ?? context.mode,
        progressIndex: context.readingPosition,
      },
      ownerId
    )
  }, [ownerId, context.wpm, context.mode, context.readingPosition])

  const handlePositionChange = useCallback(
    (wordIndex: number): void => {
      if (!isReadingActivityOwner(ownerId)) return
      const existing = loadReadingActivitySession(ownerId)
      if (existing?.completed) {
        context.setReadingPosition(wordIndex)
        return
      }
      if (existing?.progressIndex !== wordIndex) {
        hasLoggedLeaveRef.current = false
      }
      context.setReadingPosition(wordIndex)

      if (
        wordIndex > 0 &&
        !startTimeRef.current &&
        wordIndex !== pendingStartIndexRef.current
      ) {
        const startTime = new Date().toISOString()
        startTimeRef.current = startTime
        pendingStartIndexRef.current = null
        upsertReadingActivitySession(
          {
            activityId: activityIdRef.current,
            readingSessionId: readingSessionIdRef.current,
            textId: currentText.id,
            startTime,
            started: true,
            wpm: context.wpm,
            mode: context.mode,
            progressIndex: wordIndex,
          },
          ownerId
        )
      }
    },
    [ownerId, context, currentText.id]
  )

  const handleRestart = useCallback(() => {
    if (!isReadingActivityOwner(ownerId)) return
    hasLoggedCompleteRef.current = false
    hasLoggedLeaveRef.current = false
    activityIdRef.current = crypto.randomUUID()
    readingSessionIdRef.current = crypto.randomUUID()
    setReadingSessionId(readingSessionIdRef.current)
    startTimeRef.current = null
    pendingStartIndexRef.current = 0
    upsertReadingActivitySession(
      {
        activityId: activityIdRef.current,
        readingSessionId: readingSessionIdRef.current,
        textId: currentText.id,
        completed: false,
        started: false,
        startTime: null,
        progressIndex: 0,
        mode: context.mode,
        wpm: context.wpm,
      },
      ownerId
    )
    context.setReadingPosition(0)
  }, [ownerId, currentText.id, context])

  const getActivityId = useCallback(
    () =>
      isReadingActivityOwner(ownerId)
        ? (activityIdRef.current ?? undefined)
        : undefined,
    [ownerId]
  )

  return {
    handlePositionChange,
    handleRestart,
    getActivityId,
    readingSessionId,
  }
}
