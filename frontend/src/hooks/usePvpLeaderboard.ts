import { useState, useEffect, useCallback } from 'react'
import { getPvpLeaderboard } from '../services/pvpService'
import { useAuth } from './useAuth'
import type {
  PvpLeaderboardEntry,
  PvpLeaderboardEntryWithRank,
} from '../types/database'

export function usePvpLeaderboard() {
  const { user } = useAuth()
  const [top, setTop] = useState<PvpLeaderboardEntry[]>([])
  const [currentUser, setCurrentUser] =
    useState<PvpLeaderboardEntryWithRank | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function doFetch() {
      try {
        const result = await getPvpLeaderboard(user?.id)
        if (!cancelled) {
          setTop(result.top)
          setCurrentUser(result.currentUser)
        }
      } catch (err) {
        console.error('Failed to fetch PvP leaderboard:', err)
        if (!cancelled) setError('Failed to load leaderboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    doFetch()
    return () => {
      cancelled = true
    }
  }, [user?.id, fetchKey])

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1)
  }, [])

  return {
    top,
    currentUser,
    loading,
    error,
    refetch,
  }
}
