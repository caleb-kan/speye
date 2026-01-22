export type Mode = 'standard' | 'adaptive' | 'summarized'
export type ReadingType = 'dynamic' | 'static'

export interface FixedTextInfo {
  fiction: boolean
  readability: number | null
}

export interface ReadingContext {
  wpm: number
  mode: Mode
  readingType: ReadingType
  blurEnabled: boolean
  fiction: boolean
  inputBlocking: boolean
  difficultyMin: number
  difficultyMax: number
  textWidthPercent: number
  onTextWidthChange: (percent: number) => void
}
