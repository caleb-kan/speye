import { useEffect } from 'react'
import type { ReadingContext } from '../types/reading'
import type { Text } from '../types/database'

export const useReadingContextSync = (
  currentText: Text | null,
  context: ReadingContext
) => {
  const { setCurrentTextComplexity, setCurrentText } = context

  useEffect(() => {
    setCurrentTextComplexity(currentText?.complexity ?? null)
    setCurrentText(currentText)
  }, [currentText, setCurrentTextComplexity, setCurrentText])
}
