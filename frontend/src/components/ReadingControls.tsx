import { memo } from 'react'
import { Play, Pause, RotateCcw, RefreshCw } from 'lucide-react'

type ReadingControlsProps = {
  isPlaying: boolean
  onPlayPause: () => void
  onRestart: () => void
  onNewText: () => void
  progress: number
  currentWord: number
  totalWords: number
  disabled?: boolean
}

export const ReadingControls = memo(function ReadingControls({
  isPlaying,
  onPlayPause,
  onRestart,
  onNewText,
  progress,
  currentWord,
  totalWords,
  disabled = false,
}: ReadingControlsProps) {
  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Progress Bar */}
      <div className="w-full max-w-md">
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Reading progress: ${Math.round(progress)}%`}
          className="h-1 bg-bg-secondary rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-secondary">
          <span>
            {currentWord} / {totalWords} words
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onRestart}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Restart"
        >
          <RotateCcw size={20} />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          disabled={disabled}
          className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg ${
            disabled
              ? 'bg-text-secondary opacity-50 cursor-not-allowed text-bg'
              : 'bg-primary text-bg hover:opacity-90'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={24} fill="currentColor" stroke="none" />
          ) : (
            <Play size={24} fill="currentColor" stroke="none" />
          )}
        </button>

        <button
          type="button"
          onClick={onNewText}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="New text"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Keyboard Hint */}
      {!disabled && (
        <p className="text-xs text-text-secondary">
          press{' '}
          <kbd className="px-1.5 py-0.5 bg-bg-secondary rounded">space</kbd> to{' '}
          {isPlaying ? 'pause' : 'start'}
        </p>
      )}
    </div>
  )
})
