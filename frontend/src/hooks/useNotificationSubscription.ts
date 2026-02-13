import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Notification } from '../types/database'

type NotificationChangeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Notification | null
  old: { id: string } | null
}

type NotificationSubscriptionCallbacks = {
  onInsert?: (notification: Notification) => void
  onUpdate?: (notification: Notification) => void
  onDelete?: (notificationId: string) => void
}

type SubscriptionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

const INITIAL_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 30000
const RETRY_BACKOFF_MULTIPLIER = 2
const MAX_RETRY_ATTEMPTS = 5

export function useNotificationSubscription(
  userId: string | null,
  callbacks: NotificationSubscriptionCallbacks
) {
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef(callbacks)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS)
  const retryCountRef = useRef(0)
  const mountedRef = useRef(true)
  const subscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  const scheduleRetry = useCallback(() => {
    if (!mountedRef.current) return

    retryCountRef.current += 1
    if (retryCountRef.current > MAX_RETRY_ATTEMPTS) return

    clearRetryTimeout()

    retryTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && subscribeRef.current) {
        subscribeRef.current()
      }
    }, retryDelayRef.current)

    retryDelayRef.current = Math.min(
      retryDelayRef.current * RETRY_BACKOFF_MULTIPLIER,
      MAX_RETRY_DELAY_MS
    )
  }, [clearRetryTimeout])

  const unsubscribe = useCallback(() => {
    clearRetryTimeout()
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setStatus('disconnected')
  }, [clearRetryTimeout])

  const subscribe = useCallback(() => {
    if (!userId || !mountedRef.current) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    setStatus('connecting')

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const event = payload as unknown as NotificationChangeEvent

          switch (payload.eventType) {
            case 'INSERT':
              if (event.new && callbacksRef.current.onInsert) {
                callbacksRef.current.onInsert(event.new)
              }
              break
            case 'UPDATE':
              if (event.new && callbacksRef.current.onUpdate) {
                callbacksRef.current.onUpdate(event.new)
              }
              break
            case 'DELETE':
              if (event.old?.id && callbacksRef.current.onDelete) {
                callbacksRef.current.onDelete(event.old.id)
              }
              break
          }
        }
      )
      .subscribe((subscriptionStatus, err) => {
        if (!mountedRef.current) return

        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected')
          retryDelayRef.current = INITIAL_RETRY_DELAY_MS
          retryCountRef.current = 0
        } else if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'TIMED_OUT'
        ) {
          if (retryCountRef.current === 0) {
            console.error('Notification subscription error:', err)
          }
          setStatus('error')
          scheduleRetry()
        } else if (subscriptionStatus === 'CLOSED') {
          setStatus('disconnected')
          if (mountedRef.current && userId) {
            scheduleRetry()
          }
        }
      })

    channelRef.current = channel
  }, [userId, scheduleRetry])

  useEffect(() => {
    subscribeRef.current = subscribe
  }, [subscribe])

  useEffect(() => {
    mountedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- subscription manages its own state
    subscribe()

    return () => {
      mountedRef.current = false
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  return { subscribe, unsubscribe, status }
}
