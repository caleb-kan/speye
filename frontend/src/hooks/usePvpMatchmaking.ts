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

type MatchmakingState =
  'idle' | 'queuing' | 'searching' | 'canceling' | 'matched' | 'error'

function isMatchFound(
  result: MatchmakeResult
): result is Extract<
  MatchmakeResult,
  { status: 'matched' } | { status: 'already_in_game' }
> {
  return result.status === 'matched' || result.status === 'already_in_game'
}

type QueueOwner = { userId: string; accessToken: string | null }
const pendingQueueCleanups = new Map<string, Promise<string | null>>()

function leaveAfterPendingRequest(
  owner: QueueOwner,
  pendingRequest: Promise<MatchmakeResult> | null
): Promise<string | null> {
  const previous = pendingQueueCleanups.get(owner.userId)
  if (previous) return previous

  const leaving = (async () => {
    if (pendingRequest) {
      const result = await pendingRequest.catch(() => null)
      if (result && isMatchFound(result)) return result.game_id
    }
    return leaveQueue(owner.userId, owner.accessToken ?? undefined)
  })()
  pendingQueueCleanups.set(owner.userId, leaving)
  const clear = () => {
    if (pendingQueueCleanups.get(owner.userId) === leaving) {
      pendingQueueCleanups.delete(owner.userId)
    }
  }
  void leaving.then(clear, clear)
  return leaving
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
  const pendingMatchmakeRef = useRef<Promise<MatchmakeResult> | null>(null)
  const queueOwnerRef = useRef<QueueOwner | null>(null)

  const getQueueOwner = useCallback(() => {
    const owner = queueOwnerRef.current
    if (owner && userRef.current?.id === owner.userId) {
      return {
        ...owner,
        accessToken: sessionRef.current?.access_token ?? owner.accessToken,
      }
    }
    return owner
  }, [userRef, sessionRef])

  const requestMatchmake = useCallback(
    async (userId: string, rating: number) => {
      const request = matchmake(userId, rating)
      pendingMatchmakeRef.current = request
      try {
        return await request
      } finally {
        if (pendingMatchmakeRef.current === request) {
          pendingMatchmakeRef.current = null
        }
      }
    },
    []
  )

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
      stateRef.current = 'matched'
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
    const isCurrentSearch = () => callIdRef.current === callId

    try {
      const playerElo = eloRef.current ?? PVP_STARTING_ELO
      const currentUser = userRef.current
      if (!currentUser) return
      queueOwnerRef.current = {
        userId: currentUser.id,
        accessToken: sessionRef.current?.access_token ?? null,
      }
      // A previous lobby can still be removing its queue row after unmount.
      // Its removal must finish before this instance creates a new search.
      const previousCleanup = pendingQueueCleanups.get(currentUser.id)
      if (previousCleanup) await previousCleanup.catch(() => null)
      if (!isCurrentSearch() || stateRef.current !== 'queuing') return
      const result = await requestMatchmake(currentUser.id, playerElo)

      if (!isCurrentSearch() || stateRef.current !== 'queuing') return

      if (isMatchFound(result)) {
        cleanup()
        stateRef.current = 'matched'
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
      stateRef.current = 'searching'
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
        if (
          !isCurrentSearch() ||
          stateRef.current !== 'searching' ||
          retryInFlight
        )
          return
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
            retryResult = await requestMatchmake(
              retryUser.id,
              eloRef.current ?? PVP_STARTING_ELO
            )
          } catch (err) {
            if (!isCurrentSearch() || stateRef.current !== 'searching') return
            console.error('Matchmake retry failed:', err)
            failureCountRef.current += 1
            if (failureCountRef.current >= PVP_MAX_POLL_FAILURES) {
              cleanup()
              setError('Connection lost. Please try again.')
              setState('error')
            }
            return
          }

          if (!isCurrentSearch() || stateRef.current !== 'searching') return
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
        if (
          !isCurrentSearch() ||
          stateRef.current !== 'searching' ||
          pollInFlight
        )
          return
        pollInFlight = true
        try {
          const pollUser = userRef.current
          if (!pollUser) return
          const matchGameId = await getLatestMatchNotification(pollUser.id)
          if (!isCurrentSearch() || stateRef.current !== 'searching') return
          pollFailures = 0
          if (matchGameId) handleMatchFound(matchGameId)
        } catch (err) {
          if (!isCurrentSearch() || stateRef.current !== 'searching') return
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
      if (!isCurrentSearch() || stateRef.current !== 'queuing') return
      console.error('Matchmaking error:', err)
      setError('Failed to join queue')
      setState('error')
    }
  }, [
    handleMatchFound,
    cleanup,
    stateRef,
    userRef,
    sessionRef,
    eloRef,
    requestMatchmake,
  ])

  const cancelQueue = useCallback(async () => {
    if (stateRef.current === 'canceling') return
    cleanup()
    const callId = ++callIdRef.current
    stateRef.current = 'canceling'
    setState('canceling')
    setQueueTime(0)
    setError(null)
    const owner = getQueueOwner()
    let foundGameId: string | null = null
    if (owner) {
      try {
        foundGameId = await leaveAfterPendingRequest(
          owner,
          pendingMatchmakeRef.current
        )
      } catch (err) {
        if (callIdRef.current !== callId) return
        console.error('Failed to leave queue:', err)
        stateRef.current = 'error'
        setError('Failed to leave queue. Please try again or refresh.')
        setState('error')
        return
      }
    }
    if (callIdRef.current !== callId) return
    queueOwnerRef.current = null
    if (foundGameId) {
      stateRef.current = 'matched'
      setGameId(foundGameId)
      setState('matched')
    } else {
      stateRef.current = 'idle'
      setState('idle')
    }
  }, [cleanup, stateRef, getQueueOwner])

  // SPA cleanup waits for pending joins and blocks a new same-user lobby.
  // Document unload sends keepalive immediately: a promise may never settle
  // while unloading, so stale-entry cron cleanup remains the fallback.
  useEffect(() => {
    let leaveInitiated = false

    const handleUnload = () => {
      if (
        leaveInitiated ||
        !queueOwnerRef.current ||
        (stateRef.current !== 'searching' &&
          stateRef.current !== 'queuing' &&
          stateRef.current !== 'canceling')
      )
        return
      const owner = getQueueOwner()
      if (!owner) return
      const token = owner.accessToken
      if (token) {
        leaveInitiated = true
        leaveQueueOnUnload(owner.userId, token)
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      cleanup()
      callIdRef.current += 1
      // Mark idle so any in-flight matchmake() callbacks bail out
      // after cleanup, preventing intervals from being created post-unmount.
      const wasState = stateRef.current
      stateRef.current = 'idle'
      // A matched RPC already removed the queue entry.
      const owner = getQueueOwner()
      if (
        !leaveInitiated &&
        owner &&
        (wasState === 'searching' ||
          wasState === 'queuing' ||
          wasState === 'canceling')
      ) {
        leaveInitiated = true
        void leaveAfterPendingRequest(owner, pendingMatchmakeRef.current).catch(
          (err) => console.error('Failed to leave queue on unmount:', err)
        )
      }
    }
  }, [cleanup, stateRef, getQueueOwner])

  return {
    state,
    gameId,
    queueTime,
    error,
    joinQueue,
    cancelQueue,
  }
}
