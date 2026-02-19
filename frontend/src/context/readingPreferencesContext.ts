import { createContext } from 'react'
import type { Mode, Scrolling } from '../types'

export interface ReadingPreferences {
  wpm: number
  mode: Mode
  scrolling: Scrolling
  blurEnabled: boolean
  fiction: boolean
  complexityMin: number
  complexityMax: number
  textWidthPercent: number
  visibleLines: number
  phraseSize: number
}

export interface ReadingPreferencesContextType {
  preferences: ReadingPreferences
  setWpm: (wpm: number) => void
  setMode: (mode: Mode) => void
  setScrolling: (scrolling: Scrolling) => void
  setBlurEnabled: (enabled: boolean) => void
  setFiction: (fiction: boolean) => void
  setComplexityMin: (min: number) => void
  setComplexityMax: (max: number) => void
  setTextWidthPercent: (percent: number) => void
  setVisibleLines: (lines: number) => void
  setPhraseSize: (size: number) => void
}

export const ReadingPreferencesContext =
  createContext<ReadingPreferencesContextType | null>(null)
