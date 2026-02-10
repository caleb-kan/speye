import { useState, useEffect, useCallback, useRef } from 'react'
import type { Text } from '../types/database'
import { getRandomText } from '../services/textService'

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
  const initialFetchDoneRef = useRef(false)
  // Track fetch request ID to handle race conditions
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(
    async (requestId: number, f: boolean, cMin: number, cMax: number) => {
      try {
        setLoading(true)
        setError(null)

        const text = await getRandomText({
          fiction: f,
          complexityMin: cMin,
          complexityMax: cMax,
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
    []
  )

  // Public refetch function that can be called externally
  const refetch = useCallback(() => {
    const requestId = ++fetchIdRef.current
    doFetch(requestId, fiction, complexityMin, complexityMax)
  }, [doFetch, fiction, complexityMin, complexityMax])

  // Single effect for all fetch logic
  useEffect(() => {
    const isFirstRun = prevFictionRef.current === null
    const fictionChanged = !isFirstRun && prevFictionRef.current !== fiction
    prevFictionRef.current = fiction

    if (fictionChanged) {
      initialFetchDoneRef.current = false
    }

    const isOutOfRange =
      currentTextComplexity !== null &&
      (currentTextComplexity < complexityMin ||
        currentTextComplexity > complexityMax)
    const needsInitialFetch = isFirstRun && !initialFetchDoneRef.current
    const needsFetch = needsInitialFetch || fictionChanged || isOutOfRange

    if (needsFetch) {
      initialFetchDoneRef.current = true
      // Increment fetch ID to invalidate any in-flight requests
      const requestId = ++fetchIdRef.current
      doFetch(requestId, fiction, complexityMin, complexityMax)
    }
  }, [fiction, complexityMin, complexityMax, currentTextComplexity, doFetch])

  return {
    randomText,
    loading,
    error,
    refetch,
  }
}
