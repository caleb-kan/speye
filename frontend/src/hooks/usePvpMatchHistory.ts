import { useState, useEffect, useCallback } from 'react'
import { getPvpMatchHistory } from '../services/pvpService'
import { useAuth } from './useAuth'
import type { PvpMatchHistoryEntry } from '../types/database'

export function usePvpMatchHistory() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [matches, setMatches] = useState<PvpMatchHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    if (!userId) {
      setMatches([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function doFetch() {
      try {
        const data = await getPvpMatchHistory(userId!)
        if (!cancelled) setMatches(data)
      } catch (err) {
        console.error('Failed to fetch match history:', err)
        if (!cancelled) setError('Failed to load match history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    doFetch()
    return () => {
      cancelled = true
    }
  }, [userId, fetchKey])

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1)
  }, [])

  return { matches, loading, error, refetch }
}
