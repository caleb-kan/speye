import { memo } from 'react'

type ProgressBarProps = {
  /** Progress percentage (0-100) */
  progress: number
  /** Bar height in pixels (default: 4) */
  height?: number
  /** Show word count display below bar */
  showWordCount?: boolean
  /** Current word number (1-indexed) */
  currentWord?: number
  /** Total number of words */
  totalWords?: number
  /** Additional CSS class for the container */
  className?: string
}

/**
 * Shared progress bar component
 *
 * Used by both ReadingControls (with word count) and AdaptiveControls (simple)
 */
export const ProgressBar = memo(function ProgressBar({
  progress,
  height = 4,
  showWordCount = false,
  currentWord,
  totalWords,
  className = '',
}: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Reading progress: ${Math.round(progress)}%`}
        className="bg-bg-secondary rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showWordCount &&
      currentWord !== undefined &&
      totalWords !== undefined ? (
        <div className="flex justify-between mt-2 text-xs text-text-secondary">
          <span>
            {currentWord} / {totalWords} words
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
      ) : (
        <p className="text-xs text-text-secondary mt-1 text-center">
          {Math.round(progress)}% complete
        </p>
      )}
    </div>
  )
})
