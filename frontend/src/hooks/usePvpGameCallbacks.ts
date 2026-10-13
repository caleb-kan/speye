import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from 'react'
import { useRefSync } from './useRefSync'
import { useNavigate } from 'react-router-dom'
import { useReadingPreferences } from './useReadingPreferences'
import { useAuth } from './useAuth'
import { usePvpGameChannel } from './usePvpGameChannel'
import { usePvpHeartbeat } from './usePvpHeartbeat'
import { usePvpProgress } from './usePvpProgress'
import { usePvpAfkDetection } from './usePvpAfkDetection'
import {
  submitPvpResult,
  forfeitPvpGame,
  forfeitOnUnload,
} from '../services/pvpService'
import { logUserActivity } from '../services/logUserActivity'
import { saveQuizResult } from '../services/saveQuizResult'
import { computeOverallScore } from '../../../lib/scoring'
import { calculateWpmFromReading } from '../utils/wpmCalculations'
import { MAX_WPM } from '../constants/wpm'
import {
  PVP_SUBMIT_STORAGE_PREFIX,
  PVP_SUBMIT_MAX_ATTEMPTS,
  PVP_SUBMIT_RETRY_DELAY_MS,
  PVP_TICK_INTERVAL_MS,
  PVP_HALFWAY_PROGRESS_THRESHOLD,
} from '../constants/pvp'
import { ROUTES } from '../utils/routes'
import {
  readPendingSubmit,
  writePendingSubmit,
  clearPendingSubmit,
  readPvpReadingSession,
  writePvpReadingSession,
  clearPvpReadingSession,
} from '../utils/pvp'
import type { PendingSubmit, PvpReadingSession } from '../utils/pvp'
import type { MilestoneType, PvpPhase } from '../constants/pvp'
import type { PvpGame, PvpTextData } from '../types/database'

type CallbacksOptions = {
  gameId: string | null
  userId: string | null
  phase: PvpPhase
  text: PvpTextData | null
  pendingSubmit: PendingSubmit | null
  handleGameUpdate: (game: PvpGame) => void
  startQuiz: () => void
  finishQuiz: () => void
  showResults: () => void
  setGame: (game: PvpGame) => void
}

export function usePvpGameCallbacks({
  gameId,
  userId,
  phase,
  text,
  pendingSubmit,
  handleGameUpdate,
  startQuiz,
  finishQuiz,
  showResults,
  setGame,
}: CallbacksOptions) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { preferences } = useReadingPreferences()
  const sessionRef = useRefSync(session)
  const phaseRef = useRefSync(phase)
  const playerWpmRef = useRefSync(preferences.wpm)
  const adaptiveWpmRef = useRef<number | null>(null)
  const playerWpm = preferences.wpm
  const totalWords = useMemo(
    () => (text ? text.content.trim().split(/\s+/).length : 0),
    [text]
  )
  const totalWordsRef = useRefSync(totalWords)
  const textId = text?.id
  const savedReading = useMemo(
    () =>
      gameId && userId && textId
        ? readPvpReadingSession(gameId, userId, totalWords)
        : null,
    [gameId, userId, textId, totalWords]
  )
  const readingSessionRef = useRef<PvpReadingSession>({
    wordIndex: 0,
    readingStartedAt: null,
    gameStartedAt: null,
    completedWpm: null,
  })
  const persistReading = useCallback(() => {
    if (gameId && userId) {
      writePvpReadingSession(gameId, userId, readingSessionRef.current)
    }
  }, [gameId, userId])

  const [myProgress, setMyProgress] = useState(0)
  const [opponentProgress, setOpponentProgress] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [milestones, setMilestones] = useState<
    { id: string; type: MilestoneType }[]
  >([])
  const [myWpm, setMyWpm] = useState(0)
  const [myQuizScore, setMyQuizScore] = useState(0)
  const [myOverallScore, setMyOverallScore] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [forfeitError, setForfeitError] = useState<string | null>(null)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)

  const appendSaveWarning = useCallback((shortMsg: string, fullMsg: string) => {
    setSaveWarning((prev) => (prev ? `${prev} ${shortMsg}` : fullMsg))
  }, [])

  const forfeitingRef = useRef(false)
  const submittingRef = useRef(false)
  const submittedRef = useRef(false)
  const mountedRef = useRef(true)
  const initializedSessionRef = useRef<string | null>(null)
  const readingCompletedRef = useRef(false)
  const halfwaySentRef = useRef(false)
  const lastSubmitRef = useRef<PendingSubmit | null>(null)
  const activityIdRef = useRef<string | null>(null)
  const recordHeartbeatRef = useRef<(ts?: number) => void>(() => {})

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useLayoutEffect(() => {
    const key = `${gameId}:${userId}`
    if (initializedSessionRef.current === key) return
    initializedSessionRef.current = key
    forfeitingRef.current = false
    submittingRef.current = false
    submittedRef.current = false
    readingCompletedRef.current = false
    halfwaySentRef.current = false
    lastSubmitRef.current = null
    readingSessionRef.current = {
      wordIndex: 0,
      readingStartedAt: null,
      gameStartedAt: null,
      completedWpm: null,
    }
    const activityKey = `${PVP_SUBMIT_STORAGE_PREFIX}activity:${gameId}:${userId}`
    try {
      activityIdRef.current =
        sessionStorage.getItem(activityKey) ?? crypto.randomUUID()
      sessionStorage.setItem(activityKey, activityIdRef.current)
    } catch {
      activityIdRef.current = crypto.randomUUID()
    }
    adaptiveWpmRef.current = null

    setMyProgress(0)
    setOpponentProgress(0)
    setElapsedSeconds(0)
    setMilestones([])
    setMyWpm(0)
    setMyQuizScore(0)
    setMyOverallScore(0)
    setSubmitError(null)
    setForfeitError(null)
    setSaveWarning(null)
  }, [gameId, userId])

  useLayoutEffect(() => {
    if (!savedReading) return
    readingSessionRef.current = { ...savedReading }
    readingCompletedRef.current = savedReading.completedWpm !== null
    const percent =
      totalWords > 0
        ? Math.round((savedReading.wordIndex / totalWords) * 100)
        : 0
    halfwaySentRef.current = percent >= PVP_HALFWAY_PROGRESS_THRESHOLD
    setMyProgress(percent)
  }, [savedReading, totalWords])

  useEffect(() => {
    if (phase !== 'reading' && phase !== 'quiz') return
    if (readingSessionRef.current.gameStartedAt === null) {
      readingSessionRef.current.gameStartedAt = Date.now()
      persistReading()
    }
    const start = readingSessionRef.current.gameStartedAt
    setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
    }, PVP_TICK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [phase, persistReading, savedReading])

  useEffect(() => {
    if (phase === 'reading' && savedReading?.completedWpm != null) startQuiz()
    if (phase === 'results' && gameId && userId) {
      clearPvpReadingSession(gameId, userId)
    }
  }, [phase, savedReading, startQuiz, gameId, userId])

  const attemptForfeit = useCallback(async (): Promise<boolean> => {
    if (!gameId || !userId || forfeitingRef.current || submittedRef.current)
      return false
    forfeitingRef.current = true
    setForfeitError(null)
    try {
      await forfeitPvpGame(gameId, userId)
      clearPvpReadingSession(gameId, userId)
      clearPendingSubmit(gameId, userId)
      if (mountedRef.current) navigate(ROUTES.PVP)
      return true
    } catch (err) {
      console.error('Failed to forfeit:', err)
      if (!mountedRef.current) return false
      forfeitingRef.current = false
      setForfeitError('Failed to forfeit. Please try again or refresh.')
      return false
    }
  }, [gameId, userId, navigate])

  const handleForfeit = useCallback(async () => {
    await attemptForfeit()
  }, [attemptForfeit])

  const { sendProgress, sendMilestone, sendHeartbeat, connectionLost } =
    usePvpGameChannel(gameId, userId, {
      onGameUpdate: handleGameUpdate,
      onProgress: (payload) => {
        if (payload.userId !== userId) {
          setOpponentProgress(Math.min(100, Math.max(0, payload.percent)))
        }
      },
      onMilestone: (payload) => {
        if (payload.userId !== userId) {
          setMilestones((prev) => [
            ...prev,
            { id: `${Date.now()}-${payload.type}`, type: payload.type },
          ])
        }
      },
      onHeartbeat: (payload) => {
        if (payload.userId !== userId) {
          recordHeartbeatRef.current(payload.ts)
        }
      },
    })

  const { opponentDisconnected, recordHeartbeat } = usePvpHeartbeat({
    userId,
    sendHeartbeat,
    enabled: phase === 'reading' || phase === 'quiz' || phase === 'waiting',
  })

  useLayoutEffect(() => {
    recordHeartbeatRef.current = recordHeartbeat
  }, [recordHeartbeat])

  const { updateProgress } = usePvpProgress({
    userId,
    totalWords,
    sendProgress,
    enabled: phase === 'reading',
  })

  const { afkWarning, recordActivity } = usePvpAfkDetection({
    onForfeit: attemptForfeit,
    onForfeitFailed: setForfeitError,
    enabled: phase === 'reading',
  })

  const getEffectiveWpm = useCallback((): number => {
    if (preferences.mode === 'adaptive' && adaptiveWpmRef.current !== null) {
      return adaptiveWpmRef.current
    }
    if (readingSessionRef.current.completedWpm !== null) {
      return readingSessionRef.current.completedWpm
    }
    return playerWpmRef.current
  }, [preferences.mode, playerWpmRef])

  const handleAdaptiveWpmChange = useCallback((wpm: number) => {
    adaptiveWpmRef.current = wpm
  }, [])

  const handlePositionChange = useCallback(
    (wordIndex: number) => {
      if (readingCompletedRef.current) return
      recordActivity()
      readingSessionRef.current.wordIndex = wordIndex
      if (wordIndex > 0 && !readingSessionRef.current.readingStartedAt) {
        readingSessionRef.current.readingStartedAt = new Date().toISOString()
      }
      persistReading()

      const percent =
        totalWordsRef.current > 0
          ? Math.round((wordIndex / totalWordsRef.current) * 100)
          : 0
      setMyProgress(percent)
      updateProgress(wordIndex, percent)

      if (
        percent >= PVP_HALFWAY_PROGRESS_THRESHOLD &&
        !halfwaySentRef.current &&
        userId
      ) {
        halfwaySentRef.current = true
        sendMilestone({ userId, type: 'halfway' })
      }
    },
    [
      recordActivity,
      updateProgress,
      userId,
      sendMilestone,
      totalWordsRef,
      persistReading,
    ]
  )

  const handleReadingComplete = useCallback(
    (isComplete: boolean) => {
      if (
        isComplete &&
        phaseRef.current === 'reading' &&
        !readingCompletedRef.current
      ) {
        readingCompletedRef.current = true
        setMyProgress(100)

        // Compute actual WPM from elapsed reading time so the result
        // reflects the true average speed (including pauses and mid-read
        // WPM changes) rather than the last-set preference value.
        if (
          readingSessionRef.current.readingStartedAt &&
          totalWordsRef.current > 0
        ) {
          const elapsedMs =
            Date.now() -
            new Date(readingSessionRef.current.readingStartedAt).getTime()
          const computed = calculateWpmFromReading(
            totalWordsRef.current,
            elapsedMs
          )
          if (computed > 0) {
            readingSessionRef.current.completedWpm = Math.min(computed, MAX_WPM)
          }
        }

        readingSessionRef.current.wordIndex = totalWordsRef.current
        readingSessionRef.current.completedWpm = getEffectiveWpm()
        persistReading()

        if (userId) {
          updateProgress(totalWordsRef.current, 100)
          sendMilestone({ userId, type: 'started_quiz' })
        }

        if (text && readingSessionRef.current.readingStartedAt) {
          const effectiveWpm = getEffectiveWpm()
          logUserActivity(
            {
              id: activityIdRef.current ?? undefined,
              textId: text.id,
              wpm: effectiveWpm,
              startTime: readingSessionRef.current.readingStartedAt,
              endTime: new Date().toISOString(),
              mode: preferences.mode,
              progressIndex: totalWordsRef.current,
            },
            userId
          ).catch((err) => {
            console.error('Failed to log PvP activity:', err)
            appendSaveWarning(
              'Reading activity could not be saved.',
              'Reading activity could not be saved to your history.'
            )
          })
        }

        startQuiz()
      }
    },
    [
      userId,
      text,
      preferences.mode,
      getEffectiveWpm,
      updateProgress,
      sendMilestone,
      startQuiz,
      appendSaveWarning,
      phaseRef,
      totalWordsRef,
      persistReading,
    ]
  )

  const submitResult = useCallback(
    async (wpm: number, score: number) => {
      if (!gameId || !userId || submittingRef.current) return
      submittingRef.current = true

      let lastError: unknown = null
      try {
        for (let attempt = 0; attempt < PVP_SUBMIT_MAX_ATTEMPTS; attempt++) {
          if (!mountedRef.current) return
          try {
            if (attempt > 0) {
              await new Promise((r) => setTimeout(r, PVP_SUBMIT_RETRY_DELAY_MS))
              if (!mountedRef.current) return
            }
            const result = await submitPvpResult(gameId, userId, wpm, score)
            // Clear storage unconditionally so a page refresh won't
            // re-submit, even if the component has unmounted.
            clearPendingSubmit(gameId, userId)
            clearPvpReadingSession(gameId, userId)
            if (!mountedRef.current) return
            if (result) {
              setGame(result)
              if (result.status === 'completed') showResults()
            }
            setSubmitError(null)
            return
          } catch (err) {
            lastError = err
            console.error(`Submit attempt ${attempt + 1} failed:`, err)
          }
        }

        if (!mountedRef.current) return
        const detail =
          lastError instanceof Error ? ` (${lastError.message})` : ''
        setSubmitError(
          `Failed to submit your result.${detail} Please refresh the page.`
        )
      } finally {
        submittingRef.current = false
      }
    },
    [gameId, userId, showResults, setGame]
  )

  // Auto-retry a pending submission saved before a page refresh.
  useEffect(() => {
    if (
      phase !== 'waiting' ||
      !textId ||
      !pendingSubmit ||
      submittedRef.current
    )
      return
    submittedRef.current = true
    lastSubmitRef.current = pendingSubmit
    setMyWpm(pendingSubmit.wpm)
    setMyQuizScore(pendingSubmit.score)
    setMyOverallScore(
      computeOverallScore(pendingSubmit.wpm, pendingSubmit.score)
    )
    submitResult(pendingSubmit.wpm, pendingSubmit.score)
  }, [phase, textId, pendingSubmit, submitResult])

  const handleQuizFinish = useCallback(
    async (score: number) => {
      if (!gameId || !userId || submittedRef.current) return
      submittedRef.current = true

      let wpm = getEffectiveWpm()
      if (!Number.isFinite(wpm) || wpm <= 0) {
        console.error(
          'Invalid WPM at quiz submit, falling back to preference:',
          wpm
        )
        wpm = playerWpmRef.current
      }
      setMyWpm(wpm)
      setMyQuizScore(score)
      setMyOverallScore(computeOverallScore(wpm, score))

      sendMilestone({ userId, type: 'finished' })
      finishQuiz()

      if (text) {
        saveQuizResult(
          {
            text_id: text.id,
            score,
            activity_id: activityIdRef.current ?? undefined,
          },
          userId
        ).catch((err) => {
          console.error('Failed to save quiz result:', err)
          appendSaveWarning(
            'Quiz score could not be saved.',
            'Quiz score could not be saved to your activity history.'
          )
        })
      }

      lastSubmitRef.current = { wpm, score }
      if (!writePendingSubmit(gameId, userId, { wpm, score })) {
        appendSaveWarning(
          'Could not save a backup of your results.',
          'Could not save a backup of your results. Do not close this page until submission succeeds.'
        )
      }
      await submitResult(wpm, score)
    },
    [
      gameId,
      userId,
      text,
      getEffectiveWpm,
      playerWpmRef,
      sendMilestone,
      finishQuiz,
      submitResult,
      appendSaveWarning,
    ]
  )

  const retrySubmit = useCallback(async () => {
    let submitData = lastSubmitRef.current
    if (!submitData && gameId && userId) {
      submitData = readPendingSubmit(gameId, userId)
    }
    if (!submitData) {
      setSubmitError('No result to retry. Please refresh the page.')
      return
    }
    lastSubmitRef.current = submitData
    await submitResult(submitData.wpm, submitData.score)
  }, [gameId, userId, submitResult])

  // Fire-and-forget forfeit on page unload so the opponent gets immediate
  // resolution instead of waiting for the full AFK timeout.
  // forfeitOnUnload uses keepalive fetch internally to survive page navigation.
  useEffect(() => {
    const handleUnload = () => {
      const p = phaseRef.current
      if (
        gameId &&
        userId &&
        (p === 'reading' || p === 'quiz') &&
        !submittedRef.current &&
        !forfeitingRef.current
      ) {
        clearPvpReadingSession(gameId, userId)
        const token = sessionRef.current?.access_token
        if (token) {
          forfeitOnUnload(gameId, userId, token)
        } else {
          // Best-effort fallback: non-keepalive call that may not survive
          // page navigation. Server-side game expiration and the opponent's
          // client detecting a missing heartbeat provide the safety net.
          forfeitPvpGame(gameId, userId).catch((err) =>
            console.error('beforeunload forfeit fallback failed:', err)
          )
        }
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [gameId, userId, phaseRef, sessionRef])

  return {
    playerWpm,
    initialWordIndex: savedReading?.wordIndex ?? 0,
    myProgress,
    opponentProgress,
    elapsedSeconds,
    milestones,
    myWpm,
    myQuizScore,
    myOverallScore,
    afkWarning,
    opponentDisconnected,
    connectionLost,
    submitError,
    forfeitError,
    saveWarning,
    retrySubmit,
    handleForfeit,
    handlePositionChange,
    handleReadingComplete,
    handleQuizFinish,
    handleAdaptiveWpmChange,
  }
}
