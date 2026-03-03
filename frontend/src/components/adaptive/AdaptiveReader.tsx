import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { GazeData } from '../../types/webgazer'
import type { SectionData } from '../../types/database'
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
import { SectionalTextDisplay } from '../SectionalTextDisplay'
import { computeSectionWordOffsets } from '../../utils/textUtils'

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
  /** Whether to display text in sections */
  sectional?: boolean
  /** Section data array for sectional display */
  section_content?: SectionData[] | null
  /** Called when a section's reading is complete */
  onSectionComplete?: (sectionIndex: number) => void
  /** Called when the active section index changes */
  onSectionIndexChange?: (sectionIndex: number) => void
  /** Sections where the quiz was actually answered (controls dot colour in nav) */
  quizzedSections?: Set<number>
  /** Total number of sections that have quizzes (for nav status display) */
  totalSectionQuizCount?: number
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
  sectional = false,
  section_content = null,
  onSectionComplete,
  onSectionIndexChange,
  quizzedSections,
  totalSectionQuizCount,
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

  // --- Sectional state (computed before useHorizontalReader) ---
  const isSectional =
    sectional && !!section_content && section_content.length > 0

  // Memoize sections to provide stable dependency for sectionWordOffsets
  const sections = useMemo(
    () => (isSectional ? section_content! : []),
    [isSectional, section_content]
  )

  const sectionWordOffsets = useMemo(
    () => (isSectional ? computeSectionWordOffsets(sections) : [0]),
    [sections, isSectional]
  )

  // Compute which section the saved initialWordIndex belongs to (for position restoration)
  const computedInitialSectionIndex = (() => {
    if (!isSectional || initialWordIndex <= 0 || sections.length === 0) return 0
    let idx = sections.length - 1
    for (let i = 0; i < sectionWordOffsets.length - 1; i++) {
      if (
        initialWordIndex >= sectionWordOffsets[i] &&
        initialWordIndex < sectionWordOffsets[i + 1]
      ) {
        idx = i
        break
      }
    }
    return idx
  })()

  const [currentSectionIndex, setCurrentSectionIndex] = useState(
    computedInitialSectionIndex
  )

  // Section-relative initial word index passed to useHorizontalReader.
  // Starts as the within-section offset of the saved position; resets to 0
  // on every section change so the next section always starts at chunk 0.
  const computedSectionInitialWordIndex = isSectional
    ? Math.max(
        0,
        initialWordIndex -
          (sectionWordOffsets[computedInitialSectionIndex] ?? 0)
      )
    : initialWordIndex

  const [hookInitialWordIndex, setHookInitialWordIndex] = useState(
    computedSectionInitialWordIndex
  )

  // Active text: current section's content in sectional mode, full text otherwise
  const activeText =
    isSectional && sections.length > 0
      ? (sections[currentSectionIndex]?.content ?? text)
      : text

  const sectionWordOffset = sectionWordOffsets[currentSectionIndex] ?? 0

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
    text: activeText,
    gazeX: smoothedGaze?.x ?? null,
    isGazeReliable: isReliable,
    containerLeft,
    containerWidth,
    disabled: !isReadingActive,
    totalChunks,
    chunkWordCounts,
    textFillRatio,
    initialWordIndex: hookInitialWordIndex,
  })

  // Global word position (section offset + section-relative wordsRead)
  const globalWordsRead = isSectional
    ? sectionWordOffset + wordsRead
    : wordsRead

  // Global progress across all sections (0-100).
  // In sectional mode, progress from useHorizontalReader only covers the current
  // section; we replace it with a word-count-based ratio over the full text.
  const totalSectionWords = isSectional
    ? (sectionWordOffsets[sections.length] ?? 0)
    : 0
  const globalProgress = isSectional
    ? totalSectionWords > 0
      ? (globalWordsRead / totalSectionWords) * 100
      : 0
    : progress

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
    if (isSectional) {
      // In sectional mode, skip the initial 0 report when restoring within a section
      if (hookInitialWordIndex > 0 && wordsRead === 0) return
      onPositionChangeRef.current?.(globalWordsRead)
      return
    }
    // Non-sectional: avoid overwriting restored position before hook applies it
    if (
      initialWordIndex > 0 &&
      wordsRead === 0 &&
      !hasStartedReadingRef.current
    ) {
      return
    }
    hasStartedReadingRef.current = true
    onPositionChangeRef.current?.(wordsRead)
  }, [
    wordsRead,
    initialWordIndex,
    isSectional,
    sectionWordOffset,
    hookInitialWordIndex,
    globalWordsRead,
  ])

  // Notify parent of completion.
  // In sectional mode, only fire onComplete(true) when the last section is done.
  useEffect(() => {
    if (isSectional) {
      if (isComplete && currentSectionIndex >= sections.length - 1) {
        onComplete?.(true)
      } else if (!isComplete) {
        onComplete?.(false)
      }
    } else {
      onComplete?.(isComplete)
    }
  }, [
    isComplete,
    onComplete,
    isSectional,
    currentSectionIndex,
    sections.length,
  ])

  // Section completion: fire onSectionComplete when a non-last section finishes.
  // Guarded by a ref to prevent re-firing within the same section.
  const sectionCompleteTriggeredRef = useRef(false)
  useEffect(() => {
    if (!isSectional) return
    if (isComplete && !sectionCompleteTriggeredRef.current) {
      sectionCompleteTriggeredRef.current = true
      const isLastSection = currentSectionIndex >= sections.length - 1
      if (!isLastSection) {
        onSectionComplete?.(currentSectionIndex)
      }
    }
    if (!isComplete) {
      sectionCompleteTriggeredRef.current = false
    }
  }, [
    isComplete,
    isSectional,
    currentSectionIndex,
    sections.length,
    onSectionComplete,
  ])

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

  // Navigate to a different section (called by SectionalTextDisplay nav buttons)
  const handleWordIndexChange = useCallback(
    (globalIndex: number) => {
      let newSectionIdx = sections.length - 1
      for (let i = 0; i < sectionWordOffsets.length - 1; i++) {
        if (
          globalIndex >= sectionWordOffsets[i] &&
          globalIndex < sectionWordOffsets[i + 1]
        ) {
          newSectionIdx = i
          break
        }
      }
      setCurrentSectionIndex(newSectionIdx)
      // New section always starts from chunk 0
      setHookInitialWordIndex(0)
    },
    [sections.length, sectionWordOffsets]
  )

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
      <div className="pt-8 pb-4 shrink-0">
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

      {/* Text display area — sectional or standard */}
      {isSectional ? (
        <div className="flex-1 min-h-0 relative">
          {/* Section navigation header. Children is empty — reading content is
              rendered as an absolutely positioned sibling so it stays vertically
              centred in the full outer container, matching non-sectional mode. */}
          <SectionalTextDisplay
            sections={sections}
            currentWordIndex={globalWordsRead}
            onWordIndexChange={handleWordIndexChange}
            onSectionIndexChange={onSectionIndexChange}
            quizzedSections={quizzedSections}
            totalSectionQuizCount={totalSectionQuizCount}
          >
            {() => <div className="h-full" />}
          </SectionalTextDisplay>

          {/* Reading display — centred in the full outer container via absolute
              positioning. pointer-events-none lets nav-button clicks pass through. */}
          <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-5xl">
              <SingleLineTextDisplay
                text={activeText}
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
        </div>
      ) : (
        /* Main text display - centered */
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
      )}

      <AdaptiveControls
        {...sharedControlsProps}
        progress={globalProgress}
        calculatedWpm={calculatedWpm}
        disabled={false}
        trackingStatus={trackingStatus}
        showMiniQuiz={showMiniQuiz}
        onStartQuiz={onStartQuiz}
        hideProgress={isSectional}
      />
    </div>
  )
}
