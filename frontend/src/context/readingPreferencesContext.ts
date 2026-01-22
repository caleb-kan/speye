import { createContext } from 'react'
import type { Mode, ReadingType } from '../types'

export interface ReadingPreferences {
  wpm: number
  mode: Mode
  readingType: ReadingType
  blurEnabled: boolean
  fiction: boolean
  difficultyMin: number
  difficultyMax: number
  textWidthPercent: number
}

export interface ReadingPreferencesContextType {
  preferences: ReadingPreferences
  setWpm: (wpm: number) => void
  setMode: (mode: Mode) => void
  setReadingType: (readingType: ReadingType) => void
  setBlurEnabled: (enabled: boolean) => void
  setFiction: (fiction: boolean) => void
  setDifficultyMin: (min: number) => void
  setDifficultyMax: (max: number) => void
  setTextWidthPercent: (percent: number) => void
}

export const ReadingPreferencesContext =
  createContext<ReadingPreferencesContextType | null>(null)
