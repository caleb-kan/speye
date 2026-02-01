export type { Mode, Scrolling, ReadingContext, FixedTextInfo } from './reading'
export type { Quiz, Text } from './database'
export type { Theme, ThemeColors } from './theme'
export type {
  CalibrationState,
  CalibrationStatus,
  CalibrationPointState,
  SmoothedGaze,
  GazeSample,
  WebGazerStatus,
  WebGazerError,
  TrackingStatus,
} from './adaptive'

/**
 * Location state for navigation with library text.
 * Used when navigating from Library to Home with a pre-selected text.
 * The _ts field forces remount when switching modes with the same text.
 */
export interface LocationState {
  libraryText?: import('./database').Text
  /** Timestamp to force component remount when switching modes */
  _ts?: number
}
