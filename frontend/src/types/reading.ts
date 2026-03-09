import type { Text } from './database'
import type { Mode } from '../../../backend/supabase/database/userActivity/types'

export type { Mode }
export type Scrolling = 'dynamic' | 'static'

export interface FixedTextInfo {
  fiction: boolean | null
  complexity: number | null
}

export interface ActivitySessionContext {
  wpm: number
  mode: Mode
  readingPosition: number
  setReadingPosition: (position: number) => void
}

export interface ReadingContext extends ActivitySessionContext {
  scrolling: Scrolling
  blurEnabled: boolean
  fiction: boolean
  inputBlocking: boolean
  complexityMin: number
  complexityMax: number
  textWidthPercent: number
  visibleLines: number
  onTextWidthChange: (percent: number) => void
  quizOpen: boolean
  setQuizOpen: (open: boolean) => void
  currentTextComplexity: number | null
  setCurrentTextComplexity: (complexity: number | null) => void
  currentText: Text | null
  setCurrentText: (text: Text | null) => void
}
