import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { GazeData } from '../../types/webgazer'
import { SingleLineTextDisplay } from './SingleLineTextDisplay'
import { AdaptiveControls } from './AdaptiveControls'
import { CalibrationOverlay } from './calibration'
import { CalibrationPrompt } from './CalibrationPrompt'
import { DriftWarningBanner } from './DriftWarningBanner'
import { useWebGazer } from '../../hooks/useWebGazer'
import { useGazeSmoothing } from '../../hooks/useGazeSmoothing'
import { useHorizontalReader } from '../../hooks/useHorizontalReader'
import { useCalibration } from '../../hooks/useCalibration'
import { useCalibrationDriftDetection } from '../../hooks/useCalibrationDriftDetection'
import { TextTitle } from '../TextTitle'
import { useArrowNavigation } from '../../hooks/useArrowNavigation'
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
  /** Initial word index to start from (for restoring position) */
  initialWordIndex?: number
  /** Called when reading position changes (for saving position) */
  onPositionChange?: (wordIndex: number) => void
  /** Show the mini quiz button in controls */
  showMiniQuiz?: boolean
  /** Called when mini quiz button is clicked */
  onStartQuiz?: () => void
  /** Called when calculated WPM changes */
  onCalculatedWpmChange?: (wpm: number) => void
  /** Whether the reader is showing a summary */
  isSummary?: boolean
  /** Hide the new text button */
  hideNewText?: boolean
}

/** Single-line adaptive reader with horizontal gaze tracking and velocity-aware return sweep detection. */
export function AdaptiveReader({
  title,
  text,
  source,
  onNewText,
  onComplete,
  initialWordIndex = 0,
  onPositionChange,
  showMiniQuiz,
  onStartQuiz,
  onCalculatedWpmChange,
  isSummary,
  hideNewText = false,
}: AdaptiveReaderProps) {
  const [containerLeft, setContainerLeft] = useState(0)
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [totalChunks, setTotalChunks] = useState(1)
  const [chunkWordCounts, setChunkWordCounts] = useState<number[]>([])
  const [textFillRatio, setTextFillRatio] = useState(1)

  const onPositionChangeRef = useRef(onPositionChange)
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange
  }, [onPositionChange])

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
  // Only show gaze dot during active calibration (not during reading, not when disabled)
  const showGazeDot = showCalibration

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
    wordsRead,
  } = useHorizontalReader({
    text,
    gazeX: smoothedGaze?.x ?? null,
    isGazeReliable: isReliable,
    containerLeft,
    containerWidth,
    disabled: !isReadingActive,
    totalChunks,
    chunkWordCounts,
    textFillRatio,
    initialWordIndex,
  })

  useEffect(() => {
    if (Number.isFinite(calculatedWpm) && calculatedWpm > 0) {
      onCalculatedWpmChange?.(calculatedWpm)
    }
  }, [calculatedWpm, onCalculatedWpmChange])

  // Track whether we've started reporting position changes.
  // Skip reporting the initial 0 when restoring a non-zero position to avoid
  // overwriting the saved position before the hook applies it.
  const hasStartedReadingRef = useRef(initialWordIndex === 0)

  useEffect(() => {
    // When restoring a position (initialWordIndex > 0), don't report wordsRead=0
    // because the hook hasn't applied the initial position yet
    if (
      initialWordIndex > 0 &&
      wordsRead === 0 &&
      !hasStartedReadingRef.current
    ) {
      return
    }

    // Once we have words read or started from 0, we can report changes
    hasStartedReadingRef.current = true
    onPositionChangeRef.current?.(wordsRead)
  }, [wordsRead, initialWordIndex])

  // Notify parent of completion
  useEffect(() => {
    onComplete?.(isComplete)
  }, [isComplete, onComplete])

  // Keyboard navigation with arrow keys
  useArrowNavigation({
    enabled: isReadingActive,
    onBack: goBack,
    onForward: goForward,
  })

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

  const handleTextFillRatioMeasured = useCallback((ratio: number) => {
    setTextFillRatio(ratio)
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
      hideNewText,
    }),
    [
      restart,
      onNewText,
      goBack,
      goForward,
      currentChunk,
      totalChunks,
      hideNewText,
    ]
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
      <CalibrationPrompt
        title={title}
        source={source}
        onStartCalibration={handleStartCalibration}
        controlsProps={sharedControlsProps}
        isSummary={isSummary}
      />
    )
  }

  // Main reading interface
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="pt-8 shrink-0">
        {title ? (
          <TextTitle title={title} source={source} isSummary={isSummary} />
        ) : (
          <h2 className="text-2xl font-semibold text-center text-transparent select-none">
            &nbsp;
          </h2>
        )}
      </div>

      {/* Drift warning banner */}
      {driftWarning && (
        <DriftWarningBanner
          onRecalibrate={handleRetryCalibration}
          onDismiss={dismissDriftWarning}
        />
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
            onTextFillRatioMeasured={handleTextFillRatioMeasured}
          />
        </div>
      </div>

      <AdaptiveControls
        {...sharedControlsProps}
        progress={progress}
        calculatedWpm={calculatedWpm}
        disabled={false}
        trackingStatus={trackingStatus}
        showMiniQuiz={showMiniQuiz}
        onStartQuiz={onStartQuiz}
      />
    </div>
  )
}
