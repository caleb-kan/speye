import { useEffect, useRef, useCallback, useState } from 'react'
import { useRefSync } from './useRefSync'
import { supabase } from '../../../lib/supabase'
import { PVP_GAME_STATUSES } from '../types/database'
import type { PvpGame } from '../types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  MILESTONE_TYPES,
  PVP_CHANNEL_INITIAL_RETRY_DELAY_MS,
  PVP_CHANNEL_MAX_RETRY_DELAY_MS,
  PVP_CHANNEL_RETRY_BACKOFF_MULTIPLIER,
  PVP_CHANNEL_MAX_RETRY_ATTEMPTS,
  PVP_CHANNEL_SEND_FAIL_THRESHOLD,
  PVP_CHANNEL_RECOVERY_INTERVAL_MS,
} from '../constants/pvp'
import type { MilestoneType } from '../constants/pvp'

export type ProgressPayload = {
  userId: string
  wordIndex: number
  totalWords: number
  percent: number
}

export type MilestonePayload = {
  userId: string
  type: MilestoneType
}

export type HeartbeatPayload = {
  userId: string
  ts: number
}

export type BroadcastEventType = 'progress' | 'milestone' | 'heartbeat'

type GameChannelCallbacks = {
  onGameUpdate?: (game: PvpGame) => void
  onProgress?: (payload: ProgressPayload) => void
  onMilestone?: (payload: MilestonePayload) => void
  onHeartbeat?: (payload: HeartbeatPayload) => void
}

const VALID_MILESTONES = new Set<string>(MILESTONE_TYPES)

function hasFields(p: unknown, fields: Record<string, string>): boolean {
  if (p == null || typeof p !== 'object') return false
  return Object.entries(fields).every(
    ([key, type]) => typeof (p as Record<string, unknown>)[key] === type
  )
}

export function isValidProgressPayload(p: unknown): p is ProgressPayload {
  if (
    !hasFields(p, {
      userId: 'string',
      wordIndex: 'number',
      totalWords: 'number',
      percent: 'number',
    })
  )
    return false
  const { percent, wordIndex, totalWords } = p as ProgressPayload
  return percent >= 0 && percent <= 100 && wordIndex >= 0 && totalWords > 0
}

export function isValidMilestonePayload(p: unknown): p is MilestonePayload {
  return (
    hasFields(p, { userId: 'string', type: 'string' }) &&
    VALID_MILESTONES.has((p as MilestonePayload).type)
  )
}

export function isValidHeartbeatPayload(p: unknown): p is HeartbeatPayload {
  if (!hasFields(p, { userId: 'string', ts: 'number' })) return false
  return Number.isFinite((p as HeartbeatPayload).ts)
}

const VALID_GAME_STATUSES = new Set<string>(PVP_GAME_STATUSES)

export function isValidGamePayload(p: unknown): p is PvpGame {
  if (
    !hasFields(p, {
      id: 'string',
      status: 'string',
      player1_id: 'string',
      player2_id: 'string',
      text_id: 'string',
      expires_at: 'string',
      created_at: 'string',
      player1_ready: 'boolean',
      player2_ready: 'boolean',
      player1_progress: 'number',
      player2_progress: 'number',
      quiz_set_index: 'number',
    })
  )
    return false
  return VALID_GAME_STATUSES.has(
    (p as Record<string, unknown>).status as string
  )
}

export function usePvpGameChannel(
  gameId: string | null,
  userId: string | null,
  callbacks: GameChannelCallbacks
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRefSync(callbacks)
  const mountedRef = useRef(true)
  const retryDelayRef = useRef(PVP_CHANNEL_INITIAL_RETRY_DELAY_MS)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subscribeRef = useRef<(() => void) | null>(null)
  const sendFailCountRef = useRef(0)
  const [connectionLost, setConnectionLost] = useState(false)

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  const scheduleRetry = useCallback(() => {
    if (!mountedRef.current) return
    retryCountRef.current += 1
    if (retryCountRef.current > PVP_CHANNEL_MAX_RETRY_ATTEMPTS) {
      setConnectionLost(true)
      // Schedule a recovery attempt on a longer interval
      clearRetryTimeout()
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && subscribeRef.current) {
          retryCountRef.current = 0
          retryDelayRef.current = PVP_CHANNEL_INITIAL_RETRY_DELAY_MS
          subscribeRef.current()
        }
      }, PVP_CHANNEL_RECOVERY_INTERVAL_MS)
      return
    }

    clearRetryTimeout()
    retryTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && subscribeRef.current) {
        subscribeRef.current()
      }
    }, retryDelayRef.current)

    retryDelayRef.current = Math.min(
      retryDelayRef.current * PVP_CHANNEL_RETRY_BACKOFF_MULTIPLIER,
      PVP_CHANNEL_MAX_RETRY_DELAY_MS
    )
  }, [clearRetryTimeout])

  useEffect(() => {
    mountedRef.current = true
    retryDelayRef.current = PVP_CHANNEL_INITIAL_RETRY_DELAY_MS
    retryCountRef.current = 0
    sendFailCountRef.current = 0

    function createChannel() {
      if (!gameId || !userId || !mountedRef.current) return

      sendFailCountRef.current = 0

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      // ack: true enables server acknowledgment so .send() resolves with
      // 'ok'/'error' status, used by sendBroadcast to detect connection health.
      const channel = supabase.channel(`pvp-game:${gameId}`, {
        config: { broadcast: { ack: true } },
      })

      function onBroadcast<T>(
        event: BroadcastEventType,
        validate: (p: unknown) => p is T,
        handler: keyof GameChannelCallbacks
      ) {
        channel.on('broadcast', { event }, (msg) => {
          if (validate(msg.payload)) {
            ;(callbacksRef.current[handler] as ((p: T) => void) | undefined)?.(
              msg.payload
            )
          } else {
            console.error(`Invalid ${event} payload:`, msg.payload)
          }
        })
      }

      onBroadcast('progress', isValidProgressPayload, 'onProgress')
      onBroadcast('milestone', isValidMilestonePayload, 'onMilestone')
      onBroadcast('heartbeat', isValidHeartbeatPayload, 'onHeartbeat')

      // Subscribe to both player1_id and player2_id since the current user
      // could be in either column and postgres_changes filters match a single
      // column=eq.value per subscription. Requires REPLICA IDENTITY FULL on
      // pvp_games for non-PK column filtering.
      const handleGameChange = (payload: { new: unknown }) => {
        if (isValidGamePayload(payload.new)) {
          callbacksRef.current.onGameUpdate?.(payload.new)
        } else {
          console.error('Invalid game update payload:', payload.new)
        }
      }

      const pgConfig = {
        event: 'UPDATE' as const,
        schema: 'public',
        table: 'pvp_games',
      }

      channel
        .on(
          'postgres_changes',
          { ...pgConfig, filter: `player1_id=eq.${userId}` },
          handleGameChange
        )
        .on(
          'postgres_changes',
          { ...pgConfig, filter: `player2_id=eq.${userId}` },
          handleGameChange
        )

      channel.subscribe((status, err) => {
        if (!mountedRef.current) return

        if (status === 'SUBSCRIBED') {
          retryDelayRef.current = PVP_CHANNEL_INITIAL_RETRY_DELAY_MS
          retryCountRef.current = 0
          sendFailCountRef.current = 0
          setConnectionLost(false)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (retryCountRef.current === 0) {
            console.error('PvP game channel error:', err)
          }
          scheduleRetry()
        } else if (status === 'CLOSED') {
          if (mountedRef.current) {
            console.warn('PvP game channel closed unexpectedly, retrying')
            scheduleRetry()
          }
        }
      })

      channelRef.current = channel
    }

    subscribeRef.current = createChannel
    createChannel()

    return () => {
      mountedRef.current = false
      clearRetryTimeout()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacksRef is a stable ref (useRefSync)
  }, [gameId, userId, scheduleRetry, clearRetryTimeout])

  const sendBroadcast = useCallback(
    (event: BroadcastEventType, payload: unknown) => {
      if (!mountedRef.current) return
      if (!channelRef.current) {
        // Channel not yet established or being recreated during reconnection;
        // skip silently. The recovery mechanism handles actual connection loss.
        return
      }

      function handleSendFailure(detail: unknown) {
        console.error(`${event} send failed:`, detail)
        if (!mountedRef.current) return
        // All send failures are logged, but only heartbeat failures
        // increment the disconnect counter. Progress sends (500ms)
        // are too frequent and would cause false connectionLost on
        // slightly degraded networks.
        if (event === 'heartbeat') {
          sendFailCountRef.current += 1
          if (sendFailCountRef.current >= PVP_CHANNEL_SEND_FAIL_THRESHOLD) {
            setConnectionLost(true)
          }
        }
      }

      channelRef.current
        .send({ type: 'broadcast', event, payload })
        .then((status) => {
          if (!mountedRef.current) return
          if (status === 'ok') {
            if (event === 'heartbeat') {
              sendFailCountRef.current = 0
              setConnectionLost(false)
            }
          } else {
            handleSendFailure(status)
          }
        })
        .catch(handleSendFailure)
    },
    []
  )

  const sendProgress = useCallback(
    (payload: ProgressPayload) => sendBroadcast('progress', payload),
    [sendBroadcast]
  )

  const sendMilestone = useCallback(
    (payload: MilestonePayload) => sendBroadcast('milestone', payload),
    [sendBroadcast]
  )

  const sendHeartbeat = useCallback(
    (payload: HeartbeatPayload) => sendBroadcast('heartbeat', payload),
    [sendBroadcast]
  )

  return { sendProgress, sendMilestone, sendHeartbeat, connectionLost }
}
