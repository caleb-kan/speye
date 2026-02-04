import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { TextPreview } from '../types/database'

type TextChangeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: TextPreview | null
  old: { id: string } | null
}

type TextSubscriptionCallbacks = {
  onInsert?: (text: TextPreview) => void
  onUpdate?: (text: TextPreview) => void
  onDelete?: (textId: string) => void
}

type SubscriptionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Retry configuration
const INITIAL_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 30000
const RETRY_BACKOFF_MULTIPLIER = 2

/**
 * Hook for subscribing to real-time changes on the texts table.
 * Filters by owner_id to only receive updates for the user's texts.
 * Includes automatic reconnection with exponential backoff.
 */
export function useTextSubscription(
  userId: string | null,
  callbacks: TextSubscriptionCallbacks
) {
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef(callbacks)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS)
  const mountedRef = useRef(true)
  // Use a ref for subscribe function to avoid circular dependency
  const subscribeRef = useRef<(() => void) | null>(null)

  // Keep callbacks ref updated to avoid stale closures
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

    clearRetryTimeout()

    retryTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && subscribeRef.current) {
        subscribeRef.current()
      }
    }, retryDelayRef.current)

    // Exponential backoff with cap
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

    // Unsubscribe from existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    setStatus('connecting')

    const channel = supabase
      .channel(`texts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'texts',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          const event = payload as unknown as TextChangeEvent

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
          // Reset retry delay on successful connection
          retryDelayRef.current = INITIAL_RETRY_DELAY_MS
        } else if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'TIMED_OUT'
        ) {
          console.error('Subscription error:', err)
          setStatus('error')
          // Schedule retry on error
          scheduleRetry()
        } else if (subscriptionStatus === 'CLOSED') {
          setStatus('disconnected')
          // Attempt to reconnect if closed unexpectedly
          if (mountedRef.current && userId) {
            scheduleRetry()
          }
        }
      })

    channelRef.current = channel
  }, [userId, scheduleRetry])

  // Update the ref whenever subscribe changes
  useEffect(() => {
    subscribeRef.current = subscribe
  }, [subscribe])

  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    mountedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing subscription which manages its own state
    subscribe()

    return () => {
      mountedRef.current = false
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  return { subscribe, unsubscribe, status }
}
