import { useRef } from 'react'
import {
  SINGLE_LINE_FONT_SIZE,
  SINGLE_LINE_LINE_HEIGHT,
  SINGLE_LINE_HEIGHT,
  END_OF_LINE_THRESHOLD,
  END_ZONE_APPROACH_FACTOR,
  TRANSITION_DURATION_MS,
  BORDER_TRANSITION_MS,
  WILL_CHANGE_OPACITY,
  END_ZONE_FADE_TRANSITION_MS,
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
} from '../../constants/adaptive'
import { calculateDynamicThreshold } from '../../utils/gazeNormalization'
import { GazeStatusIndicator } from './GazeStatusIndicator'
import { useTextChunks } from '../../hooks/useTextChunks'
import { useTextFillRatio } from '../../hooks/useTextFillRatio'
import { useDoubleBufferText } from '../../hooks/useDoubleBufferText'

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
  const { chunks, availableWidth, fontFamily } = useTextChunks({
    text,
    containerRef,
    onContainerMeasured,
    onTotalChunksCalculated,
    onChunkWordCounts,
  })

  const currentText =
    chunks[Math.min(currentChunk, chunks.length - 1)]?.text || ''

  const textFillRatio = useTextFillRatio({
    currentText,
    availableWidth,
    fontFamily,
    onTextFillRatioMeasured,
  })

  const { activeBuffer, bufferAText, bufferBText } = useDoubleBufferText({
    currentText,
    currentChunk,
    resetKey: text,
  })

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
        <div
          className={`absolute top-0 bottom-0 pointer-events-none ${
            isSweepDetected ? 'animate-pulse' : ''
          }`}
          style={{
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

        <div
          className="relative z-10 w-full"
          style={{ height: SINGLE_LINE_FONT_SIZE * SINGLE_LINE_LINE_HEIGHT }}
        >
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
