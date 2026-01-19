export type Mode = 'standard' | 'adaptive' | 'summarized'
export type ReadingType = 'dynamic' | 'static'

export interface ReadingContext {
  wpm: number
  mode: Mode
  readingType: ReadingType
  blurEnabled: boolean
  fiction: boolean
  inputBlocking: boolean
  difficultyMin: number
  difficultyMax: number
}
