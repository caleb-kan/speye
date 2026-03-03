import { useState, useEffect, useCallback, useRef } from 'react'
import { useRefSync } from './useRefSync'
import {
  getPvpGame,
  markReady,
  getServerTime,
  getTextForPvp,
} from '../services/pvpService'
import { useAuth } from './useAuth'
import type {
  PvpGame,
  PvpGameStatus,
  PvpTextData,
  QuestionSet,
} from '../types/database'
import {
  PVP_MAX_POLL_FAILURES,
  PVP_SUBMIT_STORAGE_PREFIX,
  PVP_POLL_INTERVAL_MS,
  PVP_SLOW_POLL_INTERVAL_MS,
  PVP_CLOCK_SYNC_MAX_RETRIES,
  PVP_CLOCK_SYNC_RETRY_DELAY_MS,
  PVP_VS_SCREEN_MIN_DURATION_MS,
  SLOW_POLL_PHASES,
  POLLABLE_PHASES,
} from '../constants/pvp'
import type { PvpPhase } from '../constants/pvp'
import { readPendingSubmit } from '../utils/pvp'
import type { PendingSubmit } from '../utils/pvp'

const STATUS_RANK: Record<PvpGameStatus, number> = {
  pending: 0,
  active: 1,
  completed: 2,
  abandoned: 2,
}

export function getReadingPhase(
  readingStartedAt: string,
  offset: number
): 'countdown' | 'reading' {
  const startTime = new Date(readingStartedAt).getTime() + offset
  if (isNaN(startTime)) {
    throw new Error(`Invalid reading_started_at timestamp: ${readingStartedAt}`)
  }
  return Date.now() < startTime ? 'countdown' : 'reading'
}

/**
 * Resolve the phase for a game based on its status and reading start time.
 * Returns null when the current phase should be preserved: for pending games,
 * active games without a reading start time, active games where the current
 * phase is already at or past the expected reading transition (preventing
 * phase regression), or completed/abandoned games where the player is still
 * in reading/quiz (they finish before seeing results).
 */
export function resolvePhaseFromGame(
  gameStatus: PvpGame['status'],
  readingStartedAt: string | null,
  offset: number,
  currentPhase: PvpPhase
): PvpPhase | null {
  if (gameStatus === 'completed' || gameStatus === 'abandoned') {
    // Let the player finish reading/quiz before transitioning to results.
    // The transition happens via the submit callback or a subsequent game
    // update once they reach the waiting phase.
    if (currentPhase === 'reading' || currentPhase === 'quiz') return null
    return 'results'
  }

  if (gameStatus === 'active' && readingStartedAt) {
    const readingPhase = getReadingPhase(readingStartedAt, offset)
    if (readingPhase === 'reading') {
      if (currentPhase === 'pregame' || currentPhase === 'countdown') {
        return 'reading'
      }
    } else if (currentPhase === 'pregame') {
      return 'countdown'
    }
  }

  return null
}

/**
 * Estimate client-server clock offset for countdown sync.
 * Returns the difference (in ms) to add to a server timestamp
 * to convert it to local time.
 *
 * Formula: offset = t1 - serverMs - rtt/2
 * where t1 is the client time after the RPC, and rtt/2 estimates
 * one-way network latency.
 */
export async function fetchClockOffset(): Promise<number> {
  let lastError: unknown = null
  for (let i = 0; i <= PVP_CLOCK_SYNC_MAX_RETRIES; i++) {
    try {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, PVP_CLOCK_SYNC_RETRY_DELAY_MS))
      }
      const t0 = Date.now()
      const serverTime = await getServerTime()
      const t1 = Date.now()
      const rtt = t1 - t0
      const serverMs = new Date(serverTime).getTime()
      if (isNaN(serverMs)) {
        throw new Error('Invalid server time response')
      }
      return t1 - serverMs - Math.round(rtt / 2)
    } catch (err) {
      console.warn(`Clock sync attempt ${i + 1} failed:`, err)
      lastError = err
    }
  }
  throw lastError ?? new Error('Clock sync failed after all retries')
}

export function usePvpGameState(gameId: string | null) {
  const { user } = useAuth()
  const [phase, setPhase] = useState<PvpPhase>('loading')
  const [game, setGame] = useState<PvpGame | null>(null)
  const [text, setText] = useState<PvpTextData | null>(null)
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null)
  const [serverTimeOffset, setServerTimeOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [clockSyncWarning, setClockSyncWarning] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<PendingSubmit | null>(null)

  const phaseRef = useRefSync(phase)

  const pregameEnteredAtRef = useRef(0)
  const vsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (vsTimerRef.current) {
      clearTimeout(vsTimerRef.current)
      vsTimerRef.current = null
    }
    pregameEnteredAtRef.current = 0
    return () => {
      if (vsTimerRef.current) clearTimeout(vsTimerRef.current)
    }
  }, [gameId])

  const applyResolved = useCallback(
    (resolved: PvpPhase | null): void => {
      if (!resolved) return

      // Enforce minimum VS screen display time before transitioning
      // to countdown so players can see who they are matched against.
      if (resolved === 'countdown') {
        const elapsed = Date.now() - pregameEnteredAtRef.current
        const remaining = PVP_VS_SCREEN_MIN_DURATION_MS - elapsed
        if (remaining > 0) {
          if (vsTimerRef.current) clearTimeout(vsTimerRef.current)
          vsTimerRef.current = setTimeout(() => {
            vsTimerRef.current = null
            if (phaseRef.current === 'pregame') {
              setPhase('countdown')
            }
          }, remaining)
          return
        }
      } else if (vsTimerRef.current) {
        clearTimeout(vsTimerRef.current)
        vsTimerRef.current = null
      }

      setPhase(resolved)
    },
    [phaseRef]
  )

  useEffect(() => {
    if (!gameId || !user) return
    let cancelled = false

    async function init() {
      try {
        let serverTimeResult = 0
        let gameData: PvpGame | null = null

        const [clockResult, gameResult] = await Promise.allSettled([
          fetchClockOffset(),
          getPvpGame(gameId!),
        ])

        if (cancelled) return

        if (gameResult.status === 'rejected') {
          throw gameResult.reason
        }
        gameData = gameResult.value

        if (clockResult.status === 'fulfilled') {
          serverTimeResult = clockResult.value
        } else {
          setClockSyncWarning(true)
          console.warn('Clock sync failed, using offset=0:', clockResult.reason)
        }

        setServerTimeOffset(serverTimeResult)

        if (!gameData) {
          setError('Game not found')
          setPhase('error')
          return
        }

        if (
          gameData.player1_id !== user!.id &&
          gameData.player2_id !== user!.id
        ) {
          setError('You are not a participant in this game')
          setPhase('error')
          return
        }

        setGame(gameData)

        // Restore any pending submission saved before a page refresh
        const pending = readPendingSubmit(gameId!, PVP_SUBMIT_STORAGE_PREFIX)
        if (pending) setPendingSubmit(pending)

        const textData = await getTextForPvp(gameData.text_id)
        if (cancelled) return

        if (!textData) {
          setError('Failed to load text')
          setPhase('error')
          return
        }

        setText(textData)

        const qs = textData.quiz?.questionSets?.[gameData.quiz_set_index]
        if (qs?.questions?.length) {
          setQuestionSet(qs)
        } else {
          setError('Quiz data is missing or invalid for this text')
          setPhase('error')
          return
        }

        const resolved = resolvePhaseFromGame(
          gameData.status,
          gameData.reading_started_at,
          serverTimeResult,
          'pregame'
        )
        if (resolved) {
          applyResolved(resolved)
        } else if (gameData.status === 'pending') {
          pregameEnteredAtRef.current = Date.now()
          setPhase('pregame')
          try {
            const updated = await markReady(gameId!, user!.id)
            if (cancelled) return
            setGame(updated)
            if (updated.status === 'active' && updated.reading_started_at) {
              applyResolved(
                getReadingPhase(updated.reading_started_at, serverTimeResult)
              )
            }
          } catch (readyErr) {
            if (cancelled) return
            console.error('Failed to mark ready:', readyErr)
            setError('Failed to signal readiness. Please refresh the page.')
            setPhase('error')
          }
        } else {
          pregameEnteredAtRef.current = Date.now()
          setPhase('pregame')
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to initialize game:', err)
        const detail = err instanceof Error ? ` (${err.message})` : ''
        setError(`Failed to load game.${detail} Please refresh the page.`)
        setPhase('error')
      }
    }

    init()
    return () => {
      cancelled = true
    }
    // Use user.id (not the user object) to avoid re-running when the auth
    // context produces a new reference on token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, user?.id, applyResolved])

  // Polling fallback: ensures transitions work even if postgres_changes fails.
  // Uses phaseRef instead of phase in deps to avoid restarting the interval on
  // every phase transition, which could cause stale poll responses to race.
  const gameRef = useRefSync(game)
  const serverTimeOffsetRef = useRefSync(serverTimeOffset)
  const gameIdRef = useRefSync(gameId)

  useEffect(() => {
    if (!gameId) return

    let cancelled = false
    let polling = false
    let pollFailures = 0
    let slowPollTick = 0
    const interval = setInterval(async () => {
      if (cancelled || polling) return

      const currentPhase = phaseRef.current
      if (!POLLABLE_PHASES.has(currentPhase)) return

      // Simulate slow polling by skipping every Nth fast-interval tick,
      // avoiding the need for a separate setInterval.
      if (SLOW_POLL_PHASES.has(currentPhase)) {
        slowPollTick++
        const slowInterval = Math.round(
          PVP_SLOW_POLL_INTERVAL_MS / PVP_POLL_INTERVAL_MS
        )
        if (slowPollTick % slowInterval !== 0) return
      }

      polling = true
      try {
        const currentGameId = gameIdRef.current
        if (!currentGameId) return
        const latest = await getPvpGame(currentGameId)
        if (cancelled) return
        if (!latest) {
          cancelled = true
          clearInterval(interval)
          setError('Game no longer exists')
          setPhase('error')
          return
        }

        pollFailures = 0

        const latestPhase = phaseRef.current
        if (!POLLABLE_PHASES.has(latestPhase)) return

        // Only apply poll result if it does not downgrade the game status.
        // A real-time update may have already advanced the game to completed
        // while this poll was in-flight.
        const currentStatus = gameRef.current?.status ?? 'pending'
        if (
          (STATUS_RANK[latest.status] ?? 0) < (STATUS_RANK[currentStatus] ?? 0)
        )
          return

        setGame(latest)

        applyResolved(
          resolvePhaseFromGame(
            latest.status,
            latest.reading_started_at,
            serverTimeOffsetRef.current,
            latestPhase
          )
        )
      } catch (err) {
        if (cancelled) return
        console.error('Game poll failed:', err)
        pollFailures++
        if (pollFailures >= PVP_MAX_POLL_FAILURES) {
          cancelled = true
          clearInterval(interval)
          setError('Connection lost. Please refresh the page.')
          setPhase('error')
        }
      } finally {
        polling = false
      }
    }, PVP_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [gameId, applyResolved, gameIdRef, gameRef, phaseRef, serverTimeOffsetRef])

  const handleGameUpdate = useCallback(
    (updatedGame: PvpGame) => {
      if (updatedGame.id !== gameIdRef.current) return
      // Ignore Realtime updates while still loading: init hasn't populated
      // text/questionSet yet, so jumping to results would render an empty page.
      if (phaseRef.current === 'loading') return

      setGame(updatedGame)
      applyResolved(
        resolvePhaseFromGame(
          updatedGame.status,
          updatedGame.reading_started_at,
          serverTimeOffsetRef.current,
          phaseRef.current
        )
      )
    },
    [applyResolved, gameIdRef, phaseRef, serverTimeOffsetRef]
  )

  const startReading = useCallback(() => {
    if (phaseRef.current === 'countdown') setPhase('reading')
  }, [phaseRef])

  const startQuiz = useCallback(() => {
    if (phaseRef.current === 'reading') setPhase('quiz')
  }, [phaseRef])

  const finishQuiz = useCallback(() => {
    if (phaseRef.current === 'quiz') setPhase('waiting')
  }, [phaseRef])

  const showResults = useCallback(() => {
    if (
      phaseRef.current === 'waiting' ||
      phaseRef.current === 'quiz' ||
      phaseRef.current === 'reading'
    )
      setPhase('results')
  }, [phaseRef])

  return {
    phase,
    game,
    setGame,
    text,
    questionSet,
    serverTimeOffset,
    error,
    clockSyncWarning,
    pendingSubmit,
    handleGameUpdate,
    startReading,
    startQuiz,
    finishQuiz,
    showResults,
  }
}
