import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { NetworkStatusContext } from './networkStatusContext'
import { processQueue, recoverUnloadQueue } from '../services/syncService'
import { getQueueLength, onQueueChange } from '../services/operationQueue'
import { prefetchAllTexts } from '../services/prefetchService'
import { PREFETCH } from '../constants/offline'
import { pwaLogger } from '../utils/pwaLogger'
import {
  getForceOffline,
  isOffline,
  setForceOffline as setForceOfflineModule,
} from '../services/networkStatus'

const TAG = 'NetworkStatusProvider'

export function NetworkStatusProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOnline, setIsOnline] = useState(() => !isOffline())
  const [forceOffline, setForceOfflineState] = useState(getForceOffline)
  const [pendingOperations, setPendingOperations] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPrefetching, setIsPrefetching] = useState(false)
  // Synchronous guard: React state (isSyncing) is async and cannot prevent a
  // second concurrent call from starting before the first setState resolves.
  const isSyncingRef = useRef(false)

  const setForceOffline = useCallback((value: boolean) => {
    setForceOfflineModule(value)
    setForceOfflineState(value)
  }, [])

  const refreshPendingCount = useCallback(async () => {
    const count = await getQueueLength()
    setPendingOperations(count)
  }, [])

  const syncNow = useCallback(async () => {
    if (isOffline()) return
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    pwaLogger.info(TAG, 'Starting sync')
    setIsSyncing(true)
    try {
      await recoverUnloadQueue()
      await processQueue()
      pwaLogger.info(TAG, 'Sync complete')
    } catch (err) {
      pwaLogger.error(TAG, 'Sync failed', err)
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
      await refreshPendingCount()
    }
  }, [refreshPendingCount])

  const handleNetworkStatus = useCallback(
    (event?: Event) => {
      // When triggered by the 'offline' DOM event, trust the event type directly.
      // In WebKit, navigator.onLine can stay stale when overridden via
      // Object.defineProperty (e.g. in tests), so the event type is the most
      // reliable signal for a true offline transition.
      // For all other call sites (forceOffline toggle, mount) fall back to isOffline().
      const offline = event?.type === 'offline' ? true : isOffline()
      setIsOnline(!offline)
      if (!offline) {
        pwaLogger.info(TAG, 'Network status: ONLINE')
        void syncNow()
      } else {
        pwaLogger.info(TAG, 'Network status: OFFLINE')
      }
    },
    [syncNow]
  )

  useEffect(() => {
    window.addEventListener('online', handleNetworkStatus)
    window.addEventListener('offline', handleNetworkStatus)

    return () => {
      window.removeEventListener('online', handleNetworkStatus)
      window.removeEventListener('offline', handleNetworkStatus)
    }
  }, [handleNetworkStatus])

  // Run on mount and whenever forceOffline changes. syncNow already calls
  // recoverUnloadQueue, so no separate call is needed here.
  useEffect(() => {
    handleNetworkStatus()
  }, [forceOffline, handleNetworkStatus])

  // Prefetch on page load and on reconnect. The cooldown in prefetchAllTexts
  // (1 hour) prevents excessive network bursts.
  useEffect(() => {
    if (!isOnline || !PREFETCH.ENABLED) return
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      setIsPrefetching(true)
      try {
        await prefetchAllTexts()
      } finally {
        if (!cancelled) setIsPrefetching(false)
      }
    }, PREFETCH.DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isOnline])

  // Refresh pending count whenever the queue changes
  useEffect(() => {
    void refreshPendingCount()
    const unsubscribe = onQueueChange(() => void refreshPendingCount())
    return unsubscribe
  }, [refreshPendingCount])

  const value = useMemo(
    () => ({
      isOnline,
      forceOffline,
      setForceOffline,
      pendingOperations,
      isSyncing,
      isPrefetching,
      syncNow,
    }),
    [
      isOnline,
      forceOffline,
      setForceOffline,
      pendingOperations,
      isSyncing,
      isPrefetching,
      syncNow,
    ]
  )

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  )
}
