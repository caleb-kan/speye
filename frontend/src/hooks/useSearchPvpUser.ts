import { useState, useCallback } from 'react'
import { searchPvpUserByUsername } from '../services/pvpService'
import type { PvpLeaderboardEntry } from '../types/database'

export function useSearchPvpUser() {
  const [results, setResults] = useState<PvpLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (usernamePattern: string) => {
    setLoading(true)
    setError(null)

    try {
      const users = await searchPvpUserByUsername(usernamePattern.trim())
      setResults(users)
      if (users.length === 0 && usernamePattern.trim()) {
        // Only show error message if user actually searched for something
        setError(`No players matching "${usernamePattern}" were found`)
      } else {
        setError(null)
      }
    } catch (err) {
      console.error('Failed to search users:', err)
      setResults([])
      setError('Failed to search for players')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return { results, loading, error, search, reset }
}
