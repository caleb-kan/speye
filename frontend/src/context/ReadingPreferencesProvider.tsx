import { useState, useCallback, useMemo } from 'react'
import {
  ReadingPreferencesContext,
  type ReadingPreferences,
} from './readingPreferencesContext'
import type { Mode, ReadingType } from '../types'
import { DEFAULT_WPM } from '../constants/wpm'
import {
  DEFAULT_MIN_DIFFICULTY,
  DEFAULT_MAX_DIFFICULTY,
} from '../constants/difficulty'
import { DEFAULT_WIDTH_PERCENT } from '../constants/resize'
import { STORAGE_KEYS } from '../constants/storage'

function loadPreferences(): ReadingPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.READING_PREFERENCES)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        wpm: parsed.wpm ?? DEFAULT_WPM,
        mode: parsed.mode ?? 'standard',
        readingType: parsed.readingType ?? 'dynamic',
        blurEnabled: parsed.blurEnabled ?? false,
        fiction: parsed.fiction ?? false,
        difficultyMin: parsed.difficultyMin ?? DEFAULT_MIN_DIFFICULTY,
        difficultyMax: parsed.difficultyMax ?? DEFAULT_MAX_DIFFICULTY,
        textWidthPercent: parsed.textWidthPercent ?? DEFAULT_WIDTH_PERCENT,
      }
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  return {
    wpm: DEFAULT_WPM,
    mode: 'standard',
    readingType: 'dynamic',
    blurEnabled: false,
    fiction: false,
    difficultyMin: DEFAULT_MIN_DIFFICULTY,
    difficultyMax: DEFAULT_MAX_DIFFICULTY,
    textWidthPercent: DEFAULT_WIDTH_PERCENT,
  }
}

function savePreferences(prefs: ReadingPreferences): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.READING_PREFERENCES,
      JSON.stringify(prefs)
    )
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

export function ReadingPreferencesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [preferences, setPreferences] =
    useState<ReadingPreferences>(loadPreferences)

  const updatePreferences = useCallback(
    (update: Partial<ReadingPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...update }
        savePreferences(next)
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

  const setReadingType = useCallback(
    (readingType: ReadingType) => updatePreferences({ readingType }),
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

  const setDifficultyMin = useCallback(
    (difficultyMin: number) => updatePreferences({ difficultyMin }),
    [updatePreferences]
  )

  const setDifficultyMax = useCallback(
    (difficultyMax: number) => updatePreferences({ difficultyMax }),
    [updatePreferences]
  )

  const setTextWidthPercent = useCallback(
    (textWidthPercent: number) => updatePreferences({ textWidthPercent }),
    [updatePreferences]
  )

  const value = useMemo(
    () => ({
      preferences,
      setWpm,
      setMode,
      setReadingType,
      setBlurEnabled,
      setFiction,
      setDifficultyMin,
      setDifficultyMax,
      setTextWidthPercent,
    }),
    [
      preferences,
      setWpm,
      setMode,
      setReadingType,
      setBlurEnabled,
      setFiction,
      setDifficultyMin,
      setDifficultyMax,
      setTextWidthPercent,
    ]
  )

  return (
    <ReadingPreferencesContext.Provider value={value}>
      {children}
    </ReadingPreferencesContext.Provider>
  )
}
