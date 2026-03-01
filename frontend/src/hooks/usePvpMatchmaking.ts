import { useState, useEffect, useCallback, useRef } from 'react'
import { useRefSync } from './useRefSync'
import {
  matchmake,
  leaveQueue,
  leaveQueueOnUnload,
  getLatestMatchNotification,
} from '../services/pvpService'
import { useAuth } from './useAuth'
import {
  PVP_QUEUE_HEARTBEAT_INTERVAL_MS,
  PVP_MATCH_NOTIFICATION_POLL_MS,
  PVP_STARTING_ELO,
  PVP_MAX_POLL_FAILURES,
  PVP_TICK_INTERVAL_MS,
} from '../constants/pvp'
import type { MatchmakeResult } from '../types/database'

type MatchmakingState = 'idle' | 'queuing' | 'searching' | 'matched' | 'error'

function isMatchFound(
  result: MatchmakeResult
): result is Extract<
  MatchmakeResult,
  { status: 'matched' } | { status: 'already_in_game' }
> {
  return result.status === 'matched' || result.status === 'already_in_game'
}

export function usePvpMatchmaking(elo: number | null) {
  const { user, session } = useAuth()
  const [state, setState] = useState<MatchmakingState>('idle')
  const [gameId, setGameId] = useState<string | null>(null)
  const [queueTime, setQueueTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const retryRef = useRef<ReturnType<typeof setInterval>>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>(null)

  const stateRef = useRefSync(state)
  const userRef = useRefSync(user)
  const sessionRef = useRefSync(session)
  const eloRef = useRefSync(elo)
  const failureCountRef = useRef(0)
  const callIdRef = useRef(0)

  const cleanup = useCallback(() => {
    if (retryRef.current) {
      clearInterval(retryRef.current)
      retryRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const handleMatchFound = useCallback(
    (foundGameId: string) => {
      if (stateRef.current !== 'searching') return
      cleanup()
      setGameId(foundGameId)
      setState('matched')
    },
    [cleanup, stateRef]
  )

  const joinQueue = useCallback(async () => {
    if (
      !userRef.current ||
      (stateRef.current !== 'idle' && stateRef.current !== 'error')
    )
      return

    cleanup()
    setError(null)
    setState('queuing')
    stateRef.current = 'queuing'
    failureCountRef.current = 0
    callIdRef.current += 1
    const callId = callIdRef.current

    try {
      const playerElo = eloRef.current ?? PVP_STARTING_ELO
      const currentUser = userRef.current
      if (!currentUser) return
      const result = await matchmake(currentUser.id, playerElo)

      if (callIdRef.current !== callId || stateRef.current !== 'queuing') return

      if (isMatchFound(result)) {
        cleanup()
        setGameId(result.game_id)
        setState('matched')
        return
      }

      if (result.status === 'error') {
        setError(result.error_message || 'Matchmaking failed')
        setState('error')
        return
      }

      setState('searching')
      setQueueTime(0)

      // Three parallel intervals run while searching:
      // 1. timerRef: Drives the UI queue timer display (1s tick).
      // 2. retryRef: Re-invokes matchmake RPC every heartbeat interval.
      //    Serves as both a queue heartbeat and an instant-match check.
      // 3. pollRef: Polls pvp_match_notifications as a backup detection
      //    layer in case the matchmake RPC misses a match.
      timerRef.current = setInterval(() => {
        setQueueTime((t) => t + 1)
      }, PVP_TICK_INTERVAL_MS)

      let retryInFlight = false
      retryRef.current = setInterval(async () => {
        if (stateRef.current !== 'searching' || retryInFlight) return
        retryInFlight = true

        try {
          const retryUser = userRef.current
          if (!retryUser) {
            cleanup()
            setError('Session expired. Please log in again.')
            setState('error')
            return
          }
          let retryResult: MatchmakeResult
          try {
            retryResult = await matchmake(
              retryUser.id,
              eloRef.current ?? PVP_STARTING_ELO
            )
          } catch (err) {
            console.error('Matchmake retry failed:', err)
            failureCountRef.current += 1
            if (failureCountRef.current >= PVP_MAX_POLL_FAILURES) {
              cleanup()
              setError('Connection lost. Please try again.')
              setState('error')
            }
            return
          }

          if (stateRef.current !== 'searching') return
          failureCountRef.current = 0
          if (isMatchFound(retryResult)) {
            handleMatchFound(retryResult.game_id)
          } else if (retryResult.status === 'error') {
            cleanup()
            setError(retryResult.error_message || 'Matchmaking failed')
            setState('error')
          }
        } finally {
          retryInFlight = false
        }
      }, PVP_QUEUE_HEARTBEAT_INTERVAL_MS)

      let pollFailures = 0
      let pollInFlight = false
      pollRef.current = setInterval(async () => {
        if (stateRef.current !== 'searching' || pollInFlight) return
        pollInFlight = true
        try {
          const pollUser = userRef.current
          if (!pollUser) return
          const matchGameId = await getLatestMatchNotification(pollUser.id)
          if (stateRef.current !== 'searching') return
          pollFailures = 0
          if (matchGameId) handleMatchFound(matchGameId)
        } catch (err) {
          console.error('Match notification poll failed:', err)
          pollFailures++
          if (pollFailures >= PVP_MAX_POLL_FAILURES) {
            cleanup()
            setError('Connection lost. Please try again.')
            setState('error')
          }
        } finally {
          pollInFlight = false
        }
      }, PVP_MATCH_NOTIFICATION_POLL_MS)
    } catch (err) {
      console.error('Matchmaking error:', err)
      setError('Failed to join queue')
      setState('error')
    }
  }, [handleMatchFound, cleanup, stateRef, userRef, eloRef])

  const cancelQueue = useCallback(async () => {
    cleanup()
    // Set both ref and state synchronously before the await so in-flight
    // interval callbacks see the updated state and bail out immediately.
    // Setting setState alongside the ref write prevents useRefSync's
    // useLayoutEffect from overwriting the ref on an intermediate re-render.
    stateRef.current = 'idle'
    setState('idle')
    setQueueTime(0)
    setError(null)
    if (userRef.current) {
      try {
        await leaveQueue(userRef.current.id)
      } catch (err) {
        console.error('Failed to leave queue:', err)
        stateRef.current = 'error'
        setError('Failed to leave queue. Please try again or refresh.')
        setState('error')
      }
    }
  }, [cleanup, stateRef, userRef])

  // Queue cleanup strategy: on page unload, beforeunload fires a keepalive
  // fetch (survives navigation). On unmount, the effect cleanup fires an SDK
  // call (or keepalive fallback). A `leaveInitiated` guard prevents duplicates.
  useEffect(() => {
    let leaveInitiated = false

    const handleUnload = () => {
      if (
        leaveInitiated ||
        !userRef.current ||
        (stateRef.current !== 'searching' && stateRef.current !== 'queuing')
      )
        return
      const token = sessionRef.current?.access_token
      if (token) {
        leaveInitiated = true
        leaveQueueOnUnload(userRef.current.id, token)
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      cleanup()
      // Mark idle so any in-flight matchmake() callbacks bail out
      // after cleanup, preventing intervals from being created post-unmount.
      const wasState = stateRef.current
      stateRef.current = 'idle'
      // Only clean up the queue if the user is still searching/queuing.
      // Skip cleanup if matched (matchmaking RPC already removed them).
      // Intentionally reading latest ref values at cleanup time to get
      // the current user/session, not the values captured at effect creation.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentUser = userRef.current
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentSession = sessionRef.current
      if (
        !leaveInitiated &&
        currentUser &&
        (wasState === 'searching' || wasState === 'queuing')
      ) {
        leaveInitiated = true
        const token = currentSession?.access_token
        if (token) {
          leaveQueueOnUnload(currentUser.id, token)
        } else {
          leaveQueue(currentUser.id).catch((err) =>
            console.error('Failed to leave queue on unmount:', err)
          )
        }
      }
    }
  }, [cleanup, sessionRef, stateRef, userRef])

  return {
    state,
    gameId,
    queueTime,
    error,
    joinQueue,
    cancelQueue,
  }
}
