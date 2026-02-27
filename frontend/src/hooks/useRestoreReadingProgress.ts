import { useEffect, useState } from 'react'
import type { Text } from '../types/database'
import { getLastReadingPosition } from '../services/readingHistory'
import { splitTextToWords } from '../utils/textParsing'

export function useRestoreReadingProgress(
  currentText: Text | null,
  setReadingPosition: (index: number) => void
) {
  // Normalise incoming ID (if missing, treat as null)
  const newTextId = currentText?.id ?? null

  // Track the ID we are currently displaying/restoring
  const [restoringId, setRestoringId] = useState<string | null>(null)

  // Initialise based on whether we start with text or not
  const [isRestoring, setIsRestoring] = useState(!!currentText?.id)

  if (newTextId !== restoringId) {
    setRestoringId(newTextId)

    // If we have a text, start restoring (true).
    // If no text, we are done immediately (false).
    setIsRestoring(!!newTextId)
  }

  useEffect(() => {
    if (!newTextId) return

    let isMounted = true

    const restore = async () => {
      const lastIndex = await getLastReadingPosition(newTextId)

      if (isMounted) {
        const totalWords = currentText
          ? splitTextToWords(currentText.content).length
          : 0
        if (lastIndex !== null && lastIndex > 0 && lastIndex < totalWords - 1) {
          setReadingPosition(lastIndex)
        }

        // Safely mark restore as complete even if fetch fails or returns null (no history)
        setIsRestoring(false)
      }
    }

    void restore()

    return () => {
      isMounted = false
    }
  }, [currentText, newTextId, restoringId, setReadingPosition])

  return isRestoring
}
