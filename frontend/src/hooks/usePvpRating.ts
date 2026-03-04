import { useState, useEffect, useCallback } from 'react'
import { getPvpRating } from '../services/pvpService'
import { useAuth } from './useAuth'
import type { PvpRating } from '../types/database'

export function usePvpRating(targetUserId?: string | null) {
  const { user } = useAuth()
  const userId = targetUserId ?? user?.id ?? null
  const [rating, setRating] = useState<PvpRating | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    if (!userId) {
      setRating(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function doFetch() {
      try {
        const data = await getPvpRating(userId!)
        if (!cancelled) setRating(data)
      } catch (err) {
        console.error('Failed to fetch PvP rating:', err)
        if (!cancelled) setError('Failed to load rating')
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

  return { rating, loading, error, refetch }
}
