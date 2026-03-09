import { useEffect, useRef, useState } from 'react'
import type { Text } from '../types/database'
import { getLastReadingPosition } from '../services/readingHistory'
import { splitTextToWords } from '../utils/textParsing'

export function useRestoreReadingProgress(
  currentText: Text | null,
  setReadingPosition: (index: number) => void
) {
  const newTextId = currentText?.id ?? null
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(!!currentText?.id)

  // Keep a ref to currentText so the effect can read content without
  // re-running when the text object reference changes (e.g. realtime update)
  const currentTextRef = useRef(currentText)
  useEffect(() => {
    currentTextRef.current = currentText
  }, [currentText])

  if (newTextId !== restoringId) {
    setRestoringId(newTextId)
    setIsRestoring(!!newTextId)
  }

  useEffect(() => {
    if (!newTextId) return

    let isMounted = true

    const restore = async () => {
      const lastIndex = await getLastReadingPosition(newTextId)

      if (isMounted) {
        const text = currentTextRef.current
        const totalWords = text ? splitTextToWords(text.content).length : 0
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
  }, [newTextId, setReadingPosition])

  return isRestoring
}
