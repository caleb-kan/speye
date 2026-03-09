import { useState, useCallback, useEffect, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { fetchUserLibraryTexts } from '../services/libraryService'
import { useTextSubscription } from './useTextSubscription'
import type { TextPreview } from '../types/database'

interface UseLibraryTextsReturn {
  texts: TextPreview[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  setTexts: Dispatch<SetStateAction<TextPreview[] | null>>
}

/**
 * Hook for managing library texts with real-time updates.
 * Combines initial fetch with Supabase real-time subscription.
 */
export function useLibraryTexts(userId: string | null): UseLibraryTextsReturn {
  const [texts, setTexts] = useState<TextPreview[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTexts = useCallback(async () => {
    if (!userId) {
      setTexts(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchUserLibraryTexts(userId)
      setTexts(result || [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load texts'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchTexts()
    } else {
      setTexts(null)
    }
  }, [userId, fetchTexts])

  const subscriptionCallbacks = useMemo(
    () => ({
      onInsert: (newText: TextPreview) => {
        setTexts((prev) => {
          if (!prev) return [newText]
          // Prevent duplicates if INSERT arrives during/after fetch
          if (prev.some((t) => t.id === newText.id)) return prev
          return [newText, ...prev]
        })
      },
      onUpdate: (updatedText: TextPreview) => {
        setTexts((prev) =>
          prev
            ? prev.map((t) =>
                t.id === updatedText.id
                  ? {
                      ...updatedText,
                      // Preserve quiz from state when missing in real-time
                      // payload. PostgreSQL TOAST columns are omitted from WAL
                      // records when unchanged, so updates to other fields
                      // (e.g. quiz_valid) arrive with quiz: null. We use ??
                      // (not truthiness) so an explicit null from a quiz
                      // deletion is distinguishable only if the column is
                      // included in the WAL payload. This is an acceptable
                      // trade-off: quiz deletions also update other fields
                      // (quiz_valid), ensuring the full row is present.
                      quiz: updatedText.quiz ?? t.quiz,
                    }
                  : t
              )
            : null
        )
      },
      onDelete: (textId: string) => {
        setTexts((prev) => (prev ? prev.filter((t) => t.id !== textId) : null))
      },
    }),
    []
  )

  useTextSubscription(userId, subscriptionCallbacks)

  return {
    texts,
    loading,
    error,
    refetch: fetchTexts,
    setTexts,
  }
}
