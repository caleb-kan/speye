import { useState, useCallback, useMemo } from 'react'
import {
  ReadingPreferencesContext,
  type ReadingPreferences,
} from './readingPreferencesContext'
import type { Mode, Scrolling } from '../types'
import {
  loadReadingPreferences,
  saveReadingPreferences,
} from '../utils/readingPreferencesStorage'

export function ReadingPreferencesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [preferences, setPreferences] = useState<ReadingPreferences>(
    loadReadingPreferences
  )

  const updatePreferences = useCallback(
    (update: Partial<ReadingPreferences>) => {
      setPreferences((prev) => {
        const hasChange = (
          Object.keys(update) as Array<keyof typeof update>
        ).some((key) => prev[key] !== update[key])
        if (!hasChange) return prev
        const next = { ...prev, ...update }
        saveReadingPreferences(next)
        return next
      })
    },
    []
  )

  const setWpm = useCallback(
    (wpm: number) => updatePreferences({ wpm }),
    [updatePreferences]
  )

  const setMode = useCallback(
    (mode: Mode) => updatePreferences({ mode }),
    [updatePreferences]
  )

  const setScrolling = useCallback(
    (scrolling: Scrolling) => updatePreferences({ scrolling }),
    [updatePreferences]
  )

  const setBlurEnabled = useCallback(
    (blurEnabled: boolean) => updatePreferences({ blurEnabled }),
    [updatePreferences]
  )

  const setFiction = useCallback(
    (fiction: boolean) => updatePreferences({ fiction }),
    [updatePreferences]
  )

  const setComplexityMin = useCallback(
    (complexityMin: number) => updatePreferences({ complexityMin }),
    [updatePreferences]
  )

  const setComplexityMax = useCallback(
    (complexityMax: number) => updatePreferences({ complexityMax }),
    [updatePreferences]
  )

  const setTextWidthPercent = useCallback(
    (textWidthPercent: number) => updatePreferences({ textWidthPercent }),
    [updatePreferences]
  )

  const setVisibleLines = useCallback(
    (visibleLines: number) => updatePreferences({ visibleLines }),
    [updatePreferences]
  )

  const setPhraseSize = useCallback(
    (phraseSize: number) => updatePreferences({ phraseSize }),
    [updatePreferences]
  )

  const value = useMemo(
    () => ({
      preferences,
      setWpm,
      setMode,
      setScrolling,
      setBlurEnabled,
      setFiction,
      setComplexityMin,
      setComplexityMax,
      setTextWidthPercent,
      setVisibleLines,
      setPhraseSize,
    }),
    [
      preferences,
      setWpm,
      setMode,
      setScrolling,
      setBlurEnabled,
      setFiction,
      setComplexityMin,
      setComplexityMax,
      setTextWidthPercent,
      setVisibleLines,
      setPhraseSize,
    ]
  )

  return (
    <ReadingPreferencesContext.Provider value={value}>
      {children}
    </ReadingPreferencesContext.Provider>
  )
}
