import { memo } from 'react'
import { Play, Pause, RotateCcw, RefreshCw } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { IconButton } from './ui/IconButton'

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
      <ProgressBar
        progress={progress}
        showWordCount
        currentWord={currentWord}
        totalWords={totalWords}
        className="max-w-md"
      />

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        <IconButton
          onClick={onRestart}
          icon={<RotateCcw size={20} />}
          aria-label="Restart"
        />

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

        <IconButton
          onClick={onNewText}
          icon={<RefreshCw size={20} />}
          aria-label="New text"
        />
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
