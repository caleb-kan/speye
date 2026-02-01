import type { GazeData } from './webgazer'

/**
 * Calibration state persisted to localStorage
 */
export interface CalibrationState {
  isCalibrated: boolean
  accuracy: number | null
  lastCalibrationTime: number | null
  calibrationAttempts: number
}

/**
 * Status of the calibration state machine in CalibrationProvider.
 * Represents the overall calibration state persisted across sessions.
 */
export type CalibrationStatus =
  | 'not-started'
  | 'in-progress'
  | 'passed'
  | 'failed'

/**
 * Phase of the calibration UI flow in useCalibrationPhase.
 * Represents the current step in the active calibration process.
 */
export type CalibrationPhase =
  | 'intro'
  | 'requesting-camera'
  | 'calibrating'
  | 'measuring-accuracy'
  | 'complete'
  | 'failed'

/**
 * Status of calibration drift detection during reading.
 */
export type DriftStatus = 'good' | 'degrading' | 'poor'

/**
 * Individual calibration point state
 */
export interface CalibrationPointState {
  id: number
  x: number // screen X coordinate in pixels
  y: number // screen Y coordinate in pixels
  clicksRemaining: number
  isComplete: boolean
}

/**
 * Smoothed gaze data after temporal filtering
 */
export interface SmoothedGaze extends GazeSample {
  confidence: number // 0-1, based on sample consistency
}

/**
 * Raw gaze sample with timestamp for smoothing buffer
 */
export interface GazeSample extends GazeData {
  timestamp: number
}

/**
 * WebGazer initialization status
 */
export type WebGazerStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'error'
  | 'permission-denied'
  | 'not-supported'

/**
 * Error types for WebGazer initialization
 */
export type WebGazerError =
  | 'permission-denied'
  | 'not-supported'
  | 'initialization-failed'
  | 'unknown'

/**
 * Eye tracking data (pure data, no callbacks)
 */
export interface TrackingData {
  isReliable: boolean
  confidence: number
  webgazerReady: boolean
}

/**
 * Eye tracking status for UI display (extends TrackingData with callbacks)
 */
export interface TrackingStatus extends TrackingData {
  onRecalibrate: () => void
}

/**
 * State of the accuracy test during calibration.
 */
export type AccuracyTestState =
  | 'waiting'
  | 'collecting'
  | 'calculating'
  | 'complete'
  | 'insufficient-samples'
