import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { GazeData } from '../../types/webgazer'
import { SingleLineTextDisplay } from './SingleLineTextDisplay'
import { AdaptiveControls } from './AdaptiveControls'
import { CalibrationOverlay } from './calibration'
import { useWebGazer } from '../../hooks/useWebGazer'
import { useGazeSmoothing } from '../../hooks/useGazeSmoothing'
import { useHorizontalReader } from '../../hooks/useHorizontalReader'
import { useCalibration } from '../../hooks/useCalibration'
import { useCalibrationDriftDetection } from '../../hooks/useCalibrationDriftDetection'
import { TextTitle } from '../TextTitle'
import { Button } from '../ui/Button'
import { Crosshair, Eye, ArrowRight, AlertTriangle, X } from 'lucide-react'
import { DEFAULT_CONTAINER_WIDTH } from '../../constants/adaptive'

/**
 * Calibration UI update interval (ms).
 * 50ms (~20fps) balances gaze sample collection with render performance.
 */
const CALIBRATION_UI_UPDATE_MS = 50

type AdaptiveReaderProps = {
  /** Title of the text */
  title: string | null
  /** Text content to read */
  text: string
  /** Source of the text */
  source: string | null
  /** Called when user wants to load next text */
  onNewText: () => void
  /** Called when reading completes */
  onComplete?: (isComplete: boolean) => void
}

/** Single-line adaptive reader with horizontal gaze tracking and velocity-aware return sweep detection. */
export function AdaptiveReader({
  title,
  text,
  source,
  onNewText,
  onComplete,
}: AdaptiveReaderProps) {
  const [containerLeft, setContainerLeft] = useState(0)
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [totalChunks, setTotalChunks] = useState(1)
  const [chunkWordCounts, setChunkWordCounts] = useState<number[]>([])

  // gazeData state is ONLY used during calibration for AccuracyTest
  // During reading, gaze data flows directly to addSample (no state updates)
  const [calibrationGazeData, setCalibrationGazeData] =
    useState<GazeData | null>(null)
  const [showCalibration, setShowCalibration] = useState(false)
  const lastCalibrationUpdateRef = useRef(0)

  const calibration = useCalibration()

  // Derived state for clearer conditional logic
  const isCalibrated = calibration.state.isCalibrated
  const isReadingActive = isCalibrated && !showCalibration

  const webgazerEnabled = showCalibration || isCalibrated
  const showGazeDot = !isReadingActive

  // Gaze smoothing - applies temporal averaging with velocity-based outlier rejection
  // Must be declared before useWebGazer so addSample is available for the callback
  const { smoothedGaze, confidence, isReliable, addSample } = useGazeSmoothing()

  // Unified gaze handler that routes data appropriately:
  // - During calibration: updates state for AccuracyTest (throttled to ~20fps)
  // - During reading: passes directly to smoothing (no state update)
  const handleGaze = useCallback(
    (data: GazeData | null) => {
      if (!data) return

      if (showCalibration) {
        // During calibration, AccuracyTest needs state updates
        // Throttle to ~20fps to prevent cascade of re-renders overwhelming React
        const now = Date.now()
        if (
          now - lastCalibrationUpdateRef.current >=
          CALIBRATION_UI_UPDATE_MS
        ) {
          lastCalibrationUpdateRef.current = now
          setCalibrationGazeData(data)
        }
      } else {
        // During reading, feed smoothing pipeline directly (ref-based, minimal state updates)
        addSample(data)
      }
    },
    [showCalibration, addSample]
  )

  // WebGazer initialization
  const {
    status: webgazerStatus,
    isReady: webgazerReady,
    error: webgazerError,
    recordScreenPosition,
    clearData: clearWebGazerData,
  } = useWebGazer({
    enabled: webgazerEnabled,
    showPreview: false,
    showPredictionPoints: showGazeDot,
    onGaze: handleGaze,
  })

  // Drift detection - warns when tracking quality degrades over time
  const {
    shouldRecalibrate: driftWarning,
    dismissSuggestion: dismissDriftWarning,
    reset: resetDriftDetection,
  } = useCalibrationDriftDetection({
    isReliable,
    isReadingActive,
    isCalibrated,
  })

  // Horizontal reading with velocity transition detection
  // Advances when gaze reaches end zone and STARTS moving back left
  const {
    currentChunk,
    horizontalProgress,
    isInEndZone,
    isSweepDetected,
    isComplete,
    progress,
    calculatedWpm,
    restart,
    goBack,
    goForward,
  } = useHorizontalReader({
    text,
    gazeX: smoothedGaze?.x ?? null,
    isGazeReliable: isReliable,
    containerLeft,
    containerWidth,
    disabled: !isReadingActive,
    totalChunks,
    chunkWordCounts,
  })

  // Notify parent of completion
  useEffect(() => {
    onComplete?.(isComplete)
  }, [isComplete, onComplete])

  // Keyboard navigation with arrow keys
  useEffect(() => {
    if (!isReadingActive) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isReadingActive, goBack, goForward])

  // Container measurement callback - memoized to prevent infinite loops
  const handleContainerMeasured = useCallback((left: number, width: number) => {
    setContainerLeft(left)
    setContainerWidth(width)
  }, [])

  const handleTotalChunksCalculated = useCallback((chunks: number) => {
    setTotalChunks(chunks)
  }, [])

  const handleChunkWordCounts = useCallback((wordCounts: number[]) => {
    setChunkWordCounts(wordCounts)
  }, [])

  const handleStartCalibration = useCallback(() => {
    setShowCalibration(true)
  }, [])

  const handleCalibrationComplete = useCallback(
    (success: boolean, accuracy: number) => {
      if (success) {
        calibration.completeCalibration(accuracy)
      } else {
        calibration.failCalibration()
      }
      setShowCalibration(false)
    },
    [calibration]
  )

  const handleCalibrationCancel = useCallback(() => {
    setShowCalibration(false)
  }, [])

  const handleRetryCalibration = useCallback(async () => {
    await clearWebGazerData()
    calibration.resetCalibration()
    resetDriftDetection()
    setShowCalibration(true)
  }, [calibration, clearWebGazerData, resetDriftDetection])

  // Memoize to prevent AdaptiveControls re-renders
  const trackingStatus = useMemo(
    () => ({
      isReliable,
      confidence,
      webgazerReady,
      onRecalibrate: handleRetryCalibration,
    }),
    [isReliable, confidence, webgazerReady, handleRetryCalibration]
  )

  // Shared props for AdaptiveControls (used in both calibration prompt and main view)
  const sharedControlsProps = useMemo(
    () => ({
      onRestart: restart,
      onNewText,
      onGoBack: goBack,
      onGoForward: goForward,
      currentPage: currentChunk,
      totalPages: totalChunks,
    }),
    [restart, onNewText, goBack, goForward, currentChunk, totalChunks]
  )

  // Render calibration overlay
  if (showCalibration) {
    return (
      <CalibrationOverlay
        onComplete={handleCalibrationComplete}
        onCancel={handleCalibrationCancel}
        webgazerStatus={webgazerStatus}
        webgazerError={webgazerError}
        gazeData={calibrationGazeData}
        recordScreenPosition={recordScreenPosition}
      />
    )
  }

  // Render calibration prompt if not calibrated
  if (!isCalibrated) {
    return (
      <div className="flex flex-col flex-1">
        {title && (
          <div className="pt-8">
            <TextTitle title={title} source={source} />
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-lg">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Eye className="w-16 h-16 text-primary" />
                <ArrowRight className="w-6 h-6 text-primary absolute -right-6 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-text mb-4">
              Horizontal Eye Tracking Setup
            </h2>
            <p className="text-text-secondary mb-4">
              This reader tracks your eyes moving <strong>left to right</strong>{' '}
              as you read. When your gaze reaches the end of the line, the next
              chunk appears automatically.
            </p>
            <div className="bg-bg-secondary/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-text-secondary font-medium mb-2">
                How it works:
              </p>
              <ul className="text-sm text-text-secondary/80 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">1.</span>
                  <span>Read each chunk from left to right naturally</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">2.</span>
                  <span>
                    When your eyes reach the right side, the next chunk appears
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">3.</span>
                  <span>You can also use arrow keys for manual control</span>
                </li>
              </ul>
            </div>
            <Button onClick={handleStartCalibration}>
              <Crosshair className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              Start Calibration
            </Button>
          </div>
        </div>

        <AdaptiveControls
          {...sharedControlsProps}
          progress={0}
          calculatedWpm={0}
          disabled={true}
        />
      </div>
    )
  }

  // Main reading interface
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="pt-8 shrink-0">
        {title ? (
          <TextTitle title={title} source={source} />
        ) : (
          <h2 className="text-2xl font-semibold text-center text-transparent select-none">
            &nbsp;
          </h2>
        )}
      </div>

      {/* Drift warning banner */}
      {driftWarning && (
        <div className="mx-4 mt-4 px-4 py-3 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">
                  Eye tracking quality has degraded
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Try: Check lighting | Face the camera | Keep head still
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRetryCalibration}
                className="!px-3 !py-2 text-xs inline-flex items-center whitespace-nowrap"
              >
                <Crosshair className="w-4 h-4 mr-1 shrink-0" />
                Recalibrate
              </Button>
              <button
                onClick={dismissDriftWarning}
                className="p-1 text-text-secondary hover:text-text rounded"
                aria-label="Dismiss warning"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main text display - centered */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        <div className="w-full max-w-5xl">
          <SingleLineTextDisplay
            text={text}
            currentChunk={currentChunk}
            horizontalProgress={horizontalProgress}
            isTrackingReliable={isReliable}
            isInEndZone={isInEndZone}
            isSweepDetected={isSweepDetected}
            onContainerMeasured={handleContainerMeasured}
            onTotalChunksCalculated={handleTotalChunksCalculated}
            onChunkWordCounts={handleChunkWordCounts}
          />
        </div>
      </div>

      <AdaptiveControls
        {...sharedControlsProps}
        progress={progress}
        calculatedWpm={calculatedWpm}
        disabled={false}
        trackingStatus={trackingStatus}
      />
    </div>
  )
}
