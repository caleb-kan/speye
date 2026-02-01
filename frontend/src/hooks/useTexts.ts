import { useState, useEffect, useCallback } from 'react'
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

  const fetchRandomText = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const randomText = await getRandomText({
        fiction,
        complexityMin,
        complexityMax,
      })

      if (randomText) {
        setRandomText(randomText)
      } else {
        setRandomText(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch texts')
    } finally {
      setLoading(false)
    }
  }, [fiction, complexityMin, complexityMax])

  useEffect(() => {
    // only fetch if current complexity is not within new range
    if (
      currentTextComplexity === null ||
      currentTextComplexity < complexityMin ||
      currentTextComplexity > complexityMax
    ) {
      fetchRandomText()
    }
  }, [complexityMin, complexityMax, currentTextComplexity, fetchRandomText])

  useEffect(() => {
    // fetch new text when fiction option changes
    fetchRandomText()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiction])

  return {
    randomText,
    loading,
    error,
    refetch: fetchRandomText,
  }
}
