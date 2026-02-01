import { RotateCcw, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { ProgressBar } from '../ProgressBar'
import { IconButton } from '../ui/IconButton'
import { GazeStatusIndicator } from './GazeStatusIndicator'
import type { TrackingStatus } from '../../types/adaptive'
import { PROGRESS_BAR_HEIGHT } from '../../constants/adaptive'

type AdaptiveControlsProps = {
  /** Reading progress percentage (0-100) */
  progress: number
  /** Calculated reading speed (0 = not yet calculated) */
  calculatedWpm: number
  /** Called when restart is clicked */
  onRestart: () => void
  /** Called when new text is clicked */
  onNewText: () => void
  /** Called when go back is clicked */
  onGoBack: () => void
  /** Called when go forward is clicked */
  onGoForward: () => void
  /** Current page number (0-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Whether controls are disabled */
  disabled?: boolean
  /** Eye tracking status */
  trackingStatus?: TrackingStatus
}

/**
 * Controls bar for adaptive reading mode.
 *
 * Shows:
 * - Restart/New text buttons
 * - Progress bar
 * - Page navigation (prev/next)
 * - Calculated WPM (based on actual reading speed)
 * - Eye tracking status with recalibrate option
 *
 * Note: No play/pause - reading is purely gaze-driven
 */
export function AdaptiveControls({
  progress,
  calculatedWpm,
  onRestart,
  onNewText,
  onGoBack,
  onGoForward,
  currentPage,
  totalPages,
  disabled = false,
  trackingStatus,
}: AdaptiveControlsProps) {
  const canGoBack = currentPage > 0
  const canGoForward = currentPage < totalPages - 1

  return (
    <div className="flex items-center justify-center gap-6 py-4 px-8 bg-bg shrink-0">
      <IconButton
        onClick={onRestart}
        disabled={disabled}
        icon={<RotateCcw className="w-5 h-5" />}
        aria-label="Restart reading"
      />

      <IconButton
        onClick={onNewText}
        disabled={disabled}
        icon={<RefreshCw className="w-5 h-5" />}
        aria-label="New text"
      />

      <ProgressBar
        progress={progress}
        height={PROGRESS_BAR_HEIGHT}
        className="flex-1 max-w-md"
      />

      <div className="flex items-center gap-1">
        <IconButton
          onClick={onGoBack}
          disabled={disabled || !canGoBack}
          icon={<ChevronLeft className="w-5 h-5" />}
          aria-label="Go back one chunk"
          className="disabled:opacity-30"
        />
        <IconButton
          onClick={onGoForward}
          disabled={disabled || !canGoForward}
          icon={<ChevronRight className="w-5 h-5" />}
          aria-label="Go forward one chunk"
          className="disabled:opacity-30"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-text">
          {calculatedWpm > 0 ? calculatedWpm : '--'}
        </span>
        <span className="text-sm text-text-secondary">wpm</span>
      </div>

      {trackingStatus && (
        <div className="flex items-center gap-3">
          <GazeStatusIndicator
            isReliable={trackingStatus.isReliable}
            webgazerReady={trackingStatus.webgazerReady}
            confidence={trackingStatus.confidence}
            variant="detailed"
          />
          <button
            onClick={trackingStatus.onRecalibrate}
            className="text-sm text-text-secondary hover:text-text"
          >
            Recalibrate
          </button>
        </div>
      )}
    </div>
  )
}
