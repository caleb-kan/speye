export type {
  Mode,
  ReadingType,
  ReadingContext,
  FixedTextInfo,
} from './reading'
export type { Quiz, Text } from './database'
export type { Theme, ThemeColors } from './theme'

/**
 * Location state for navigation with library text.
 * Used when navigating from Library to Home with a pre-selected text.
 */
export interface LocationState {
  libraryText?: import('./database').Text
}
