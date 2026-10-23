import { useState, useCallback, useRef } from 'react'
import { searchPvpUserByUsername } from '../services/pvpService'
import type { PvpLeaderboardEntry } from '../types/database'

export function useSearchPvpUser() {
  const [results, setResults] = useState<PvpLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const search = useCallback(async (usernamePattern: string) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const users = await searchPvpUserByUsername(usernamePattern.trim())
      if (requestId !== requestIdRef.current) return
      setResults(users)
      if (users.length === 0 && usernamePattern.trim()) {
        // Only show error message if user actually searched for something
        setError(`No players matching "${usernamePattern}" were found`)
      } else {
        setError(null)
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      console.error('Failed to search users:', err)
      setResults([])
      setError('Failed to search for players')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    requestIdRef.current += 1
    setResults([])
    setError(null)
    setLoading(false)
  }, [])

  return { results, loading, error, search, reset }
}
