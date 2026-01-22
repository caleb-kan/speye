import { useState, useEffect, useCallback } from 'react'
import type { Text } from '../types/database'
import { getTexts } from '../../../backend/supabase/database/texts/getTexts'

type UseTextsOptions = {
  fiction: boolean
  complexityMin: number
  complexityMax: number
}

export function useTexts({
  fiction,
  complexityMin,
  complexityMax,
}: UseTextsOptions) {
  const [texts, setTexts] = useState<Text[]>([])
  const [currentText, setCurrentText] = useState<Text | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTexts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const texts = await getTexts({ fiction, complexityMin, complexityMax })
      setTexts(texts || [])

      if (texts && texts.length > 0) {
        const randomIndex = Math.floor(Math.random() * texts.length)
        setCurrentText(texts[randomIndex])
      } else {
        setCurrentText(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch texts')
    } finally {
      setLoading(false)
    }
  }, [fiction, complexityMin, complexityMax])

  const selectRandomText = useCallback(() => {
    if (texts.length === 0) return

    let newText: Text
    if (texts.length === 1) {
      newText = texts[0]
    } else {
      do {
        const randomIndex = Math.floor(Math.random() * texts.length)
        newText = texts[randomIndex]
      } while (newText.id === currentText?.id)
    }

    setCurrentText(newText)
  }, [texts, currentText])

  useEffect(() => {
    fetchTexts()
  }, [fetchTexts])

  return {
    texts,
    currentText,
    loading,
    error,
    selectRandomText,
    refetch: fetchTexts,
  }
}
