export type Mode = 'standard' | 'adaptive' | 'summarized'
export type Scrolling = 'dynamic' | 'static'

export interface FixedTextInfo {
  fiction: boolean | null
  complexity: number | null
}

export interface ReadingContext {
  wpm: number
  mode: Mode
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
}
