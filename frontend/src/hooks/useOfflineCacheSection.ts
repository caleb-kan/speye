import { useState, useEffect, useRef } from 'react'
import { useNetworkStatus } from './useNetworkStatus'
import { getCacheStats, clearAllCaches } from '../services/offlineCache'
import { prefetchAllTexts } from '../services/prefetchService'

const CACHE_STATS_POLL_INTERVAL_MS = 500
const HOVER_SUPPRESSION_DURATION_MS = 400

export function useOfflineCacheSection() {
  const {
    isOnline,
    forceOffline,
    setForceOffline,
    pendingOperations,
    isSyncing,
    isPrefetching: backgroundPrefetching,
    syncNow,
  } = useNetworkStatus()

  const [textCount, setTextCount] = useState(0)
  const [cacheSize, setCacheSize] = useState(0)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [prefetching, setPrefetching] = useState(false)
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)
  const [hoverSuppressed, setHoverSuppressed] = useState(false)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    async function load() {
      const stats = await getCacheStats()
      if (!mountedRef.current) return
      setTextCount(stats.textCount)
      setCacheSize(stats.totalSizeEstimate)
      setLastSync(stats.lastSyncTime)
    }
    void load()
  }, [pendingOperations, isSyncing, statsRefreshKey])

  const isCurrentlyPrefetching = prefetching || backgroundPrefetching

  useEffect(() => {
    if (!isCurrentlyPrefetching) return

    let active = true
    const interval = setInterval(async () => {
      const stats = await getCacheStats()
      if (!mountedRef.current || !active) return
      setTextCount(stats.textCount)
      setCacheSize(stats.totalSizeEstimate)
    }, CACHE_STATS_POLL_INTERVAL_MS)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [isCurrentlyPrefetching])

  function suppressHover() {
    setHoverSuppressed(true)
    setTimeout(() => {
      if (mountedRef.current) setHoverSuppressed(false)
    }, HOVER_SUPPRESSION_DURATION_MS)
  }

  const handleSaveOffline = async () => {
    setPrefetching(true)
    await prefetchAllTexts()
    if (!mountedRef.current) return
    setStatsRefreshKey((k) => k + 1)
    setPrefetching(false)
    suppressHover()
  }

  const handleSyncNow = () => {
    void syncNow().then(() => {
      if (mountedRef.current) suppressHover()
    })
  }

  const handleClearConfirmed = async () => {
    setShowClearConfirm(false)
    setClearing(true)
    await clearAllCaches()
    if (!mountedRef.current) return
    setTextCount(0)
    setCacheSize(0)
    setClearing(false)
  }

  return {
    isOnline,
    forceOffline,
    setForceOffline,
    pendingOperations,
    isSyncing,
    textCount,
    cacheSize,
    lastSync,
    clearing,
    showClearConfirm,
    setShowClearConfirm,
    prefetching,
    isCurrentlyPrefetching,
    hoverSuppressed,
    handleSaveOffline,
    handleSyncNow,
    handleClearConfirmed,
  }
}
