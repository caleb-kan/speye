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

export function ReadingControls({
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
          <RestartIcon />
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
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          onClick={onNewText}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="New text"
        >
          <RefreshIcon />
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
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="block"
      aria-hidden="true"
    >
      <path d="M6 4v16l14-8z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="block"
      aria-hidden="true"
    >
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block"
      aria-hidden="true"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}
