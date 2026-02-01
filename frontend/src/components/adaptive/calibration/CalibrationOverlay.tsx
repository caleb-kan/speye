import { useCallback } from 'react'
import type { GazeData } from '../../../types/webgazer'
import type { WebGazerStatus } from '../../../types/adaptive'
import { CalibrationIntro } from './CalibrationIntro'
import { CalibrationLoading } from './CalibrationLoading'
import { CalibrationFailed } from './CalibrationFailed'
import { CalibrationProgress } from './CalibrationProgress'
import { AccuracyTest } from '../AccuracyTest'
import { useCalibrationPhase } from './useCalibrationPhase'
import { getAccuracyTargetPosition } from '../../../utils/coordinateSystem'

type CalibrationOverlayProps = {
  /** Called when calibration completes (success or failure) */
  onComplete: (success: boolean, accuracy: number) => void
  /** Called when user cancels calibration */
  onCancel: () => void
  /** Current WebGazer status */
  webgazerStatus: WebGazerStatus
  /** WebGazer error message */
  webgazerError: string | null
  /** Current gaze data from WebGazer */
  gazeData: GazeData | null
  /** Record screen position for calibration training */
  recordScreenPosition: (x: number, y: number) => void
}

/**
 * Calibration overlay for horizontal eye tracking setup.
 *
 * Guides user through:
 * 1. Introduction with instructions
 * 2. Camera permission request
 * 3. 9-point calibration (click targets while looking)
 * 4. Accuracy measurement
 */
export function CalibrationOverlay({
  onComplete,
  onCancel,
  webgazerStatus,
  webgazerError,
  gazeData,
  recordScreenPosition,
}: CalibrationOverlayProps) {
  const {
    phase,
    points,
    currentPointIndex,
    containerRect,
    readingAreaRef,
    handleStartCalibration,
    handlePointClick,
    markComplete,
    totalPoints,
  } = useCalibrationPhase({
    webgazerStatus,
    recordScreenPosition,
  })

  // Handle accuracy test completion
  const handleAccuracyComplete = useCallback(
    (accuracy: number, passed: boolean) => {
      markComplete()
      onComplete(passed, accuracy)
    },
    [onComplete, markComplete]
  )

  // Phase-based rendering
  switch (phase) {
    case 'intro':
      return (
        <CalibrationIntro
          onStart={handleStartCalibration}
          onCancel={onCancel}
          webgazerStatus={webgazerStatus}
        />
      )

    case 'requesting-camera':
      return (
        <CalibrationLoading
          webgazerStatus={webgazerStatus}
          onCancel={onCancel}
        />
      )

    case 'failed':
      return (
        <CalibrationFailed
          webgazerStatus={webgazerStatus}
          webgazerError={webgazerError}
          onRetry={handleStartCalibration}
          onCancel={onCancel}
        />
      )

    case 'calibrating':
      return (
        <CalibrationProgress
          points={points}
          currentPointIndex={currentPointIndex}
          totalPoints={totalPoints}
          readingAreaRef={readingAreaRef}
          onPointClick={handlePointClick}
          onCancel={onCancel}
        />
      )

    case 'measuring-accuracy': {
      // Use text area center (not full container center) for accuracy target
      // This matches where calibration points were positioned
      const accuracyTargetPosition =
        getAccuracyTargetPosition(containerRect) ?? undefined

      return (
        <AccuracyTest
          gazeData={gazeData}
          onComplete={handleAccuracyComplete}
          targetPosition={accuracyTargetPosition}
        />
      )
    }

    default:
      return null
  }
}
