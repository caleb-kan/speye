import {
  useRef,
  useEffect,
  useState,
  useLayoutEffect,
  useCallback,
} from 'react'
import {
  SINGLE_LINE_FONT_SIZE,
  SINGLE_LINE_FONT_WEIGHT,
  SINGLE_LINE_LINE_HEIGHT,
  SINGLE_LINE_HEIGHT,
  END_OF_LINE_THRESHOLD,
  DEFAULT_FONT_FAMILY,
  END_ZONE_APPROACH_FACTOR,
  TRANSITION_DURATION_MS,
  BORDER_TRANSITION_MS,
  WILL_CHANGE_OPACITY,
  END_ZONE_FADE_TRANSITION_MS,
  PROGRESS_BAR_TRANSITION_MS,
  TRANSITION_EASE_ENTER,
  TRANSITION_EASE_EXIT,
  READING_CONTAINER_CLASSES,
  CONTAINER_BG_TRACKING_OPACITY,
  CONTAINER_BG_IDLE_OPACITY,
  BORDER_END_ZONE_OPACITY,
  BORDER_TRACKING_OPACITY,
  BORDER_IDLE_OPACITY,
  END_ZONE_SWEEP_OPACITY,
  END_ZONE_ACTIVE_OPACITY,
  END_ZONE_APPROACHING_OPACITY,
  TEXT_UNRELIABLE_OPACITY,
  MIN_TEXT_FILL_RATIO,
} from '../../constants/adaptive'
import { calculateDynamicThreshold } from '../../utils/gazeNormalization'
import {
  splitTextToFitWidthWithMetadata,
  type ChunkData,
} from '../../utils/textChunking'
import { GazeStatusIndicator } from './GazeStatusIndicator'
import { getTextAreaBounds } from '../../utils/coordinateSystem'
import { useResizeObserverWithRef } from '../../hooks/useResizeObserver'

type SingleLineTextDisplayProps = {
  text: string
  currentChunk: number
  horizontalProgress: number
  isTrackingReliable: boolean
  isInEndZone?: boolean
  isSweepDetected?: boolean
  onContainerMeasured?: (left: number, width: number) => void
  onTotalChunksCalculated?: (totalChunks: number) => void
  onChunkWordCounts?: (wordCounts: number[]) => void
  /** Called when text fill ratio changes (0-1, ratio of text width to container width) */
  onTextFillRatioMeasured?: (ratio: number) => void
}

export function SingleLineTextDisplay({
  text,
  currentChunk,
  horizontalProgress,
  isTrackingReliable,
  isInEndZone = false,
  isSweepDetected = false,
  onContainerMeasured,
  onTotalChunksCalculated,
  onChunkWordCounts,
  onTextFillRatioMeasured,
}: SingleLineTextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [availableWidth, setAvailableWidth] = useState(0)
  const [textFillRatio, setTextFillRatio] = useState(1)
  const fontFamilyRef = useRef(DEFAULT_FONT_FAMILY)
  const [chunks, setChunks] = useState<ChunkData[]>([])

  // Double-buffer system for smooth crossfade transitions
  // Both buffers are always in DOM, we just toggle opacity
  const [activeBuffer, setActiveBuffer] = useState<'A' | 'B'>('A')
  const [bufferAText, setBufferAText] = useState('')
  const [bufferBText, setBufferBText] = useState('')

  const lastMeasurementsRef = useRef({ left: 0, width: 0 })
  const prevChunkRef = useRef(currentChunk)
  const initializedRef = useRef(false)

  const currentText =
    chunks[Math.min(currentChunk, chunks.length - 1)]?.text || ''

  // Handle chunk changes with double-buffer crossfade
  useEffect(() => {
    if (chunks.length === 0 || !currentText) return

    // Initial load: set both buffers to current text, no transition
    if (!initializedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialization of derived state
      setBufferAText(currentText)
      setBufferBText(currentText)
      setActiveBuffer('A')
      initializedRef.current = true
      prevChunkRef.current = currentChunk
      return
    }

    // Only transition if chunk actually changed
    if (prevChunkRef.current === currentChunk) return

    // Update the inactive buffer with new text, then switch to it
    if (activeBuffer === 'A') {
      setBufferBText(currentText)
      setActiveBuffer('B')
    } else {
      setBufferAText(currentText)
      setActiveBuffer('A')
    }

    prevChunkRef.current = currentChunk
  }, [currentChunk, chunks, currentText, activeBuffer])

  const handleResize = useCallback(
    (rect: DOMRect) => {
      const textAreaBounds = getTextAreaBounds(rect)
      if (!textAreaBounds) return

      setAvailableWidth(textAreaBounds.width)

      const container = containerRef.current
      if (container) {
        const computedStyle = window.getComputedStyle(container)
        fontFamilyRef.current = computedStyle.fontFamily || DEFAULT_FONT_FAMILY
      }

      const last = lastMeasurementsRef.current
      if (
        textAreaBounds.left !== last.left ||
        textAreaBounds.width !== last.width
      ) {
        lastMeasurementsRef.current = {
          left: textAreaBounds.left,
          width: textAreaBounds.width,
        }
        onContainerMeasured?.(textAreaBounds.left, textAreaBounds.width)
      }
    },
    [onContainerMeasured]
  )

  useResizeObserverWithRef(containerRef, handleResize)

  useLayoutEffect(() => {
    if (availableWidth <= 0 || !text) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- derived state reset
      setChunks([])
      return
    }
    // Reset initialization flag when text changes so buffers get reinitialized
    initializedRef.current = false
    prevChunkRef.current = 0
    setChunks(
      splitTextToFitWidthWithMetadata(
        text,
        availableWidth,
        fontFamilyRef.current
      )
    )
  }, [text, availableWidth])

  useEffect(() => {
    onTotalChunksCalculated?.(chunks.length)
    if (chunks.length > 0) {
      onChunkWordCounts?.(chunks.map((chunk) => chunk.wordCount))
    }
  }, [chunks, onTotalChunksCalculated, onChunkWordCounts])

  // Measure text width and report fill ratio for dynamic end-zone calculation
  useEffect(() => {
    if (availableWidth <= 0 || !currentText) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to default when no text
      setTextFillRatio(1)
      onTextFillRatioMeasured?.(1)
      return
    }

    // Measure actual text width using the same font properties
    const measureSpan = document.createElement('span')
    measureSpan.style.visibility = 'hidden'
    measureSpan.style.position = 'absolute'
    measureSpan.style.whiteSpace = 'nowrap'
    measureSpan.style.fontWeight = String(SINGLE_LINE_FONT_WEIGHT)
    measureSpan.style.fontFamily = fontFamilyRef.current
    measureSpan.style.fontSize = `${SINGLE_LINE_FONT_SIZE}px`
    measureSpan.style.lineHeight = String(SINGLE_LINE_LINE_HEIGHT)
    measureSpan.textContent = currentText
    document.body.appendChild(measureSpan)

    const textWidth = measureSpan.offsetWidth
    document.body.removeChild(measureSpan)

    const ratio = Math.min(
      1,
      Math.max(MIN_TEXT_FILL_RATIO, textWidth / availableWidth)
    )
    setTextFillRatio(ratio)
    onTextFillRatioMeasured?.(ratio)
  }, [currentText, availableWidth, onTextFillRatioMeasured])

  // Calculate local effective threshold to stay in sync with visual positioning
  const localEffectiveThreshold = calculateDynamicThreshold(
    textFillRatio,
    END_OF_LINE_THRESHOLD
  )
  const isApproachingEnd =
    horizontalProgress >= localEffectiveThreshold * END_ZONE_APPROACH_FACTOR

  const textStyle = {
    fontSize: SINGLE_LINE_FONT_SIZE,
    lineHeight: SINGLE_LINE_LINE_HEIGHT,
  }

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center ${READING_CONTAINER_CLASSES} overflow-hidden`}
        style={{
          minHeight: SINGLE_LINE_HEIGHT,
          background: isTrackingReliable
            ? `color-mix(in srgb, var(--color-primary) ${CONTAINER_BG_TRACKING_OPACITY}%, var(--color-bg))`
            : `color-mix(in srgb, var(--color-text-secondary) ${CONTAINER_BG_IDLE_OPACITY}%, var(--color-bg))`,
          border: isInEndZone
            ? `2px solid color-mix(in srgb, var(--color-success) ${BORDER_END_ZONE_OPACITY}%, transparent)`
            : isTrackingReliable
              ? `2px solid color-mix(in srgb, var(--color-primary) ${BORDER_TRACKING_OPACITY}%, transparent)`
              : `2px solid color-mix(in srgb, var(--color-text-secondary) ${BORDER_IDLE_OPACITY}%, transparent)`,
          transition: `border-color ${BORDER_TRANSITION_MS}ms ease-out`,
        }}
      >
        {/* End-zone indicator - extends from dynamic threshold to container edge */}
        <div
          className={`absolute top-0 bottom-0 pointer-events-none ${
            isSweepDetected ? 'animate-pulse' : ''
          }`}
          style={{
            // Extend to container edge, width spans from dynamic threshold to right edge
            right: 0,
            width: `${(1 - localEffectiveThreshold) * 100}%`,
            background: isSweepDetected
              ? `linear-gradient(to right, transparent, color-mix(in srgb, var(--color-success) ${END_ZONE_SWEEP_OPACITY}%, transparent))`
              : isInEndZone
                ? `linear-gradient(to right, transparent, color-mix(in srgb, var(--color-success) ${END_ZONE_ACTIVE_OPACITY}%, transparent))`
                : isApproachingEnd
                  ? `linear-gradient(to right, transparent, color-mix(in srgb, var(--color-primary) ${END_ZONE_APPROACHING_OPACITY}%, transparent))`
                  : 'transparent',
            opacity: isTrackingReliable ? 1 : 0,
            transition: `opacity ${END_ZONE_FADE_TRANSITION_MS}ms`,
          }}
        />

        {/* Double-buffer text container for smooth crossfade transitions */}
        <div
          className="relative z-10 w-full"
          style={{ height: SINGLE_LINE_FONT_SIZE * SINGLE_LINE_LINE_HEIGHT }}
        >
          {/* Buffer A */}
          <div
            className="absolute inset-0 flex items-center justify-center text-center text-text font-medium whitespace-nowrap"
            style={{
              ...textStyle,
              willChange: WILL_CHANGE_OPACITY,
              opacity:
                activeBuffer === 'A'
                  ? isTrackingReliable
                    ? 1
                    : TEXT_UNRELIABLE_OPACITY
                  : 0,
              transition: `opacity ${TRANSITION_DURATION_MS}ms ${activeBuffer === 'A' ? TRANSITION_EASE_ENTER : TRANSITION_EASE_EXIT}`,
            }}
            aria-hidden={activeBuffer !== 'A'}
          >
            {bufferAText}
          </div>

          {/* Buffer B */}
          <div
            className="absolute inset-0 flex items-center justify-center text-center text-text font-medium whitespace-nowrap"
            role="region"
            aria-label="Reading content"
            aria-live="polite"
            aria-atomic="true"
            style={{
              ...textStyle,
              willChange: WILL_CHANGE_OPACITY,
              opacity:
                activeBuffer === 'B'
                  ? isTrackingReliable
                    ? 1
                    : TEXT_UNRELIABLE_OPACITY
                  : 0,
              transition: `opacity ${TRANSITION_DURATION_MS}ms ${activeBuffer === 'B' ? TRANSITION_EASE_ENTER : TRANSITION_EASE_EXIT}`,
            }}
            aria-hidden={activeBuffer !== 'B'}
          >
            {bufferBText}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-secondary/20 rounded-b-xl overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${horizontalProgress * 100}%`,
              background: isInEndZone
                ? 'var(--color-success)'
                : isTrackingReliable
                  ? 'var(--color-primary)'
                  : 'var(--color-text-secondary)',
              opacity: isTrackingReliable ? 0.7 : 0.3,
              transition: `all ${PROGRESS_BAR_TRANSITION_MS}ms`,
            }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-3 px-2 text-sm text-text-secondary">
        <span
          aria-label={`Reading chunk ${currentChunk + 1} of ${chunks.length}`}
        >
          Chunk {currentChunk + 1} of {chunks.length}
        </span>
        <span className="text-xs">
          <GazeStatusIndicator
            isReliable={isTrackingReliable}
            isInEndZone={isInEndZone}
            isSweepDetected={isSweepDetected}
            variant="minimal"
          />
        </span>
      </div>
    </div>
  )
}
