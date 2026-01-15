import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Text } from '../types/database'

export function useTexts() {
  const [texts, setTexts] = useState<Text[]>([])
  const [currentText, setCurrentText] = useState<Text | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialFetchDone = useRef(false)

  const fetchTexts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('texts')
        .select('*')
        .eq('is_public', true)

      if (fetchError) {
        throw fetchError
      }

      setTexts(data || [])

      if (data && data.length > 0 && !initialFetchDone.current) {
        const randomIndex = Math.floor(Math.random() * data.length)
        setCurrentText(data[randomIndex])
        initialFetchDone.current = true
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch texts')
    } finally {
      setLoading(false)
    }
  }, [])

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
