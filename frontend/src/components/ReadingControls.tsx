import { memo } from 'react'
import { Play, Pause, RotateCcw, RefreshCw, BookOpenCheck } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { IconButton } from './ui/IconButton'
import { useIsMobile } from '../hooks/useIsMobile'

type ReadingControlsProps = {
  isPlaying: boolean
  onPlayPause: () => void
  onRestart: () => void
  onNewText: () => void
  onStartQuiz?: () => void
  showMiniQuiz?: boolean
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
  onStartQuiz,
  showMiniQuiz = false,
  progress,
  currentWord,
  totalWords,
  disabled = false,
}: ReadingControlsProps) {
  const isMobile = useIsMobile()

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

      {/* Control Buttons Container */}
      <div className="relative w-full max-w-md flex items-center justify-center h-14">
        {/* CENTER GROUP: Main Controls */}
        <div className="flex items-center gap-4 z-10">
          <IconButton
            onClick={onRestart}
            icon={<RotateCcw size={20} />}
            aria-label="Restart"
          />

          <button
            type="button"
            onClick={onPlayPause}
            disabled={disabled}
            className={
              (isMobile && isPlaying ? 'w-44 ' : 'w-14 ') +
              `h-14 flex items-center justify-center rounded-full transition-all 
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg 
              ${
                disabled
                  ? 'bg-text-secondary opacity-50 cursor-not-allowed text-bg'
                  : 'bg-primary text-bg hover:opacity-90'
              }
            `
            }
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

        {/* RIGHT GROUP: Divider & Quiz Button */}
        {/* Absolutely positioned to the right edge of the max-w-md container */}
        <div
          className={`
            absolute right-0 top-1/2 -translate-y-1/2
            flex items-center gap-3
            transition-all duration-500 ease-out
            ${showMiniQuiz ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}
          `}
        >
          {/* The Divider */}
          <div className="w-px h-8 bg-text-secondary/20" />

          {/* Quiz Button */}
          <button
            onClick={onStartQuiz}
            className="
              h-10 w-10 flex items-center justify-center rounded-xl
              text-primary hover:text-text hover:bg-primary/20
              transition-all duration-300
              animate-in fade-in zoom-in
            "
            title="Take Quiz"
          >
            <BookOpenCheck size={20} />
          </button>
        </div>
      </div>

      {/* Keyboard Hint */}
      {!disabled && !isMobile && (
        <p className="text-xs text-text-secondary">
          press{' '}
          <kbd className="px-1.5 py-0.5 bg-bg-secondary rounded">space</kbd> to{' '}
          {isPlaying ? 'pause' : 'start'}
        </p>
      )}
    </div>
  )
})
