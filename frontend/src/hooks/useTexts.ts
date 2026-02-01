import { useState, useEffect, useCallback, useRef } from 'react'
import type { Text } from '../types/database'
import { getRandomText } from '../../../backend/supabase/database/texts/getTexts'

type UseTextsOptions = {
  fiction: boolean
  complexityMin: number
  complexityMax: number
  currentTextComplexity: number | null
}

export function useTexts({
  fiction,
  complexityMin,
  complexityMax,
  currentTextComplexity,
}: UseTextsOptions) {
  const [randomText, setRandomText] = useState<Text | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track previous values to detect changes
  const prevFictionRef = useRef<boolean | null>(null)
  // Track fetch request ID to handle race conditions
  const fetchIdRef = useRef(0)

  const fetchRandomText = useCallback(
    async (requestId: number) => {
      try {
        setLoading(true)
        setError(null)

        const text = await getRandomText({
          fiction,
          complexityMin,
          complexityMax,
        })

        // Only update state if this is still the latest request
        if (fetchIdRef.current === requestId) {
          setRandomText(text ?? null)
          setLoading(false)
        }
      } catch (err) {
        // Only update state if this is still the latest request
        if (fetchIdRef.current === requestId) {
          setError(err instanceof Error ? err.message : 'Failed to fetch texts')
          setLoading(false)
        }
      }
    },
    [fiction, complexityMin, complexityMax]
  )

  // Public refetch function that can be called externally
  const refetch = useCallback(() => {
    const requestId = ++fetchIdRef.current
    fetchRandomText(requestId)
  }, [fetchRandomText])

  // Single effect for all fetch logic
  useEffect(() => {
    const isFirstRun = prevFictionRef.current === null
    const fictionChanged = !isFirstRun && prevFictionRef.current !== fiction
    prevFictionRef.current = fiction

    // Determine if we need to fetch
    const needsFetch =
      isFirstRun ||
      fictionChanged ||
      currentTextComplexity === null ||
      currentTextComplexity < complexityMin ||
      currentTextComplexity > complexityMax

    if (needsFetch) {
      // Increment fetch ID to invalidate any in-flight requests
      const requestId = ++fetchIdRef.current
      fetchRandomText(requestId)
    }
  }, [
    fiction,
    complexityMin,
    complexityMax,
    currentTextComplexity,
    fetchRandomText,
  ])

  return {
    randomText,
    loading,
    error,
    refetch,
  }
}
