import { useEffect } from 'react'
import type { Text } from '../types/database'

export const useAdaptiveTextSync = (
  currentText: Text | null,
  setCurrentTextComplexity: (value: number | null) => void,
  setAdaptiveSessionWpm: (value: number | null) => void
) => {
  useEffect(() => {
    setCurrentTextComplexity(currentText?.complexity ?? null)
    setAdaptiveSessionWpm(null)
  }, [currentText, setCurrentTextComplexity, setAdaptiveSessionWpm])
}
