import { useState, useCallback, useMemo } from 'react'
import {
  ReadingPreferencesContext,
  type ReadingPreferences,
} from './readingPreferencesContext'
import type { Mode, Scrolling } from '../types'
import { DEFAULT_WPM } from '../constants/wpm'
import {
  DEFAULT_MIN_COMPLEXITY,
  DEFAULT_MAX_COMPLEXITY,
} from '../constants/complexity'
import { DEFAULT_WIDTH_PERCENT } from '../constants/resize'
import { DEFAULT_VISIBLE_LINES } from '../constants/visibleLines'
import { STORAGE_KEYS } from '../constants/storage'

function loadPreferences(): ReadingPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.READING_PREFERENCES)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        wpm: parsed.wpm ?? DEFAULT_WPM,
        mode:
          parsed.mode === 'standard' || parsed.mode === 'adaptive'
            ? parsed.mode
            : 'standard',
        scrolling: parsed.scrolling ?? 'dynamic',
        blurEnabled: parsed.blurEnabled ?? false,
        fiction: parsed.fiction ?? false,
        complexityMin: parsed.complexityMin ?? DEFAULT_MIN_COMPLEXITY,
        complexityMax: parsed.complexityMax ?? DEFAULT_MAX_COMPLEXITY,
        textWidthPercent: parsed.textWidthPercent ?? DEFAULT_WIDTH_PERCENT,
        visibleLines: parsed.visibleLines ?? DEFAULT_VISIBLE_LINES,
      }
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  return {
    wpm: DEFAULT_WPM,
    mode: 'standard',
    scrolling: 'dynamic',
    blurEnabled: false,
    fiction: false,
    complexityMin: DEFAULT_MIN_COMPLEXITY,
    complexityMax: DEFAULT_MAX_COMPLEXITY,
    textWidthPercent: DEFAULT_WIDTH_PERCENT,
    visibleLines: DEFAULT_VISIBLE_LINES,
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
    ]
  )

  return (
    <ReadingPreferencesContext.Provider value={value}>
      {children}
    </ReadingPreferencesContext.Provider>
  )
}
