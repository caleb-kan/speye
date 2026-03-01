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
import {
  PVP_SUBMIT_STORAGE_PREFIX,
  PVP_SUBMIT_MAX_ATTEMPTS,
  PVP_SUBMIT_RETRY_DELAY_MS,
  PVP_TICK_INTERVAL_MS,
} from '../constants/pvp'
import { ROUTES } from '../utils/routes'
import {
  readPendingSubmit,
  writePendingSubmit,
  clearPendingSubmit,
} from '../utils/pvp'
import type { PendingSubmit } from '../utils/pvp'
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

  // Short form when appending to existing warnings to avoid long banner text;
  // full form when this is the first warning for additional context.
  const appendSaveWarning = useCallback((shortMsg: string, fullMsg: string) => {
    setSaveWarning((prev) => (prev ? `${prev} ${shortMsg}` : fullMsg))
  }, [])

  const forfeitingRef = useRef(false)
  const submittingRef = useRef(false)
  const submittedRef = useRef(false)
  const mountedRef = useRef(true)
  const readingCompletedRef = useRef(false)
  const halfwaySentRef = useRef(false)
  const lastSubmitRef = useRef<PendingSubmit | null>(null)
  const readingStartRef = useRef<string | null>(null)
  const recordHeartbeatRef = useRef<(ts?: number) => void>(() => {})
  const gameStartRef = useRef<number | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    forfeitingRef.current = false
    submittingRef.current = false
    submittedRef.current = false
    readingCompletedRef.current = false
    halfwaySentRef.current = false
    lastSubmitRef.current = null
    readingStartRef.current = null
    gameStartRef.current = null
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
  }, [gameId])

  const totalWords = useMemo(
    () => (text ? text.content.trim().split(/\s+/).length : 0),
    [text]
  )
  const totalWordsRef = useRefSync(totalWords)

  // Tracks elapsed reading+quiz time (not including pregame/countdown).
  // Uses wall-clock measurement to avoid setInterval drift over long games.
  useEffect(() => {
    if (phase !== 'reading' && phase !== 'quiz') return
    if (!gameStartRef.current) gameStartRef.current = Date.now()
    const start = gameStartRef.current
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
    }, PVP_TICK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [phase])

  const handleForfeit = useCallback(async () => {
    if (!gameId || !userId || forfeitingRef.current || submittedRef.current)
      return
    forfeitingRef.current = true
    setForfeitError(null)
    try {
      await forfeitPvpGame(gameId, userId)
      clearPendingSubmit(gameId, PVP_SUBMIT_STORAGE_PREFIX)
      if (!mountedRef.current) return
      navigate(ROUTES.PVP)
    } catch (err) {
      console.error('Failed to forfeit:', err)
      if (!mountedRef.current) return
      forfeitingRef.current = false
      setForfeitError('Failed to forfeit. Please try again or refresh.')
    }
  }, [gameId, userId, navigate])

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

  // Syncs recordHeartbeat to ref so the onHeartbeat callback (passed to
  // usePvpGameChannel above) can call it without a circular hook dependency.
  // Uses useLayoutEffect (matching useRefSync convention) to eliminate the
  // timing gap between render and effect where the ref could be stale.
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
    onForfeit: handleForfeit,
    onForfeitFailed: setForfeitError,
    enabled: phase === 'reading',
  })

  const getEffectiveWpm = useCallback(
    (): number =>
      preferences.mode === 'adaptive' && adaptiveWpmRef.current !== null
        ? adaptiveWpmRef.current
        : playerWpmRef.current,
    [preferences.mode, playerWpmRef]
  )

  const handleAdaptiveWpmChange = useCallback((wpm: number) => {
    adaptiveWpmRef.current = wpm
  }, [])

  const handlePositionChange = useCallback(
    (wordIndex: number) => {
      recordActivity()

      if (wordIndex > 0 && !readingStartRef.current) {
        readingStartRef.current = new Date().toISOString()
      }

      const percent =
        totalWordsRef.current > 0
          ? Math.round((wordIndex / totalWordsRef.current) * 100)
          : 0
      setMyProgress(percent)
      updateProgress(wordIndex, percent)

      if (percent >= 50 && !halfwaySentRef.current && userId) {
        halfwaySentRef.current = true
        sendMilestone({ userId, type: 'halfway' })
      }
    },
    [recordActivity, updateProgress, userId, sendMilestone, totalWordsRef]
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
        if (userId) {
          updateProgress(totalWordsRef.current, 100)
          sendMilestone({ userId, type: 'started_quiz' })
        }

        if (text && readingStartRef.current) {
          const effectiveWpm = getEffectiveWpm()
          logUserActivity({
            textId: text.id,
            wpm: effectiveWpm,
            startTime: readingStartRef.current,
            endTime: new Date().toISOString(),
            mode: preferences.mode,
            progressIndex: totalWordsRef.current,
          }).catch((err) => {
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
            clearPendingSubmit(gameId, PVP_SUBMIT_STORAGE_PREFIX)
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
    if (!pendingSubmit || submittedRef.current) return
    submittedRef.current = true
    lastSubmitRef.current = pendingSubmit
    setMyWpm(pendingSubmit.wpm)
    setMyQuizScore(pendingSubmit.score)
    setMyOverallScore(
      computeOverallScore(pendingSubmit.wpm, pendingSubmit.score)
    )
    finishQuiz()
    submitResult(pendingSubmit.wpm, pendingSubmit.score)
  }, [pendingSubmit, finishQuiz, submitResult])

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
        saveQuizResult({ text_id: text.id, score }).catch((err) => {
          console.error('Failed to save quiz result:', err)
          appendSaveWarning(
            'Quiz score could not be saved.',
            'Quiz score could not be saved to your activity history.'
          )
        })
      }

      lastSubmitRef.current = { wpm, score }
      if (
        !writePendingSubmit(gameId, PVP_SUBMIT_STORAGE_PREFIX, { wpm, score })
      ) {
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
    if (!submitData && gameId) {
      submitData = readPendingSubmit(gameId, PVP_SUBMIT_STORAGE_PREFIX)
    }
    if (!submitData) {
      setSubmitError('No result to retry. Please refresh the page.')
      return
    }
    lastSubmitRef.current = submitData
    await submitResult(submitData.wpm, submitData.score)
  }, [gameId, submitResult])

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
