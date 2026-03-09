import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { PVP_LONG_WAIT_THRESHOLD_MS } from '../../../constants/pvp'

type PvpWaitingScreenProps = {
  myWpm: number
  myQuizScore: number
  myOverallScore: number
  onLeave?: () => void
  hasSubmitError?: boolean
}

export function PvpWaitingScreen({
  myWpm,
  myQuizScore,
  myOverallScore,
  onLeave,
  hasSubmitError,
}: PvpWaitingScreenProps) {
  const [waitingLong, setWaitingLong] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(
      () => setWaitingLong(true),
      PVP_LONG_WAIT_THRESHOLD_MS
    )
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div
      className="max-w-md mx-auto text-center py-16 animate-in fade-in duration-500"
      role="status"
      aria-label="Waiting for opponent to finish"
    >
      <Loader2
        size={32}
        className="text-primary animate-spin mx-auto mb-6"
        aria-hidden="true"
      />
      <h2 className="text-xl font-semibold text-text mb-2">
        Waiting for opponent to finish...
      </h2>
      <p className="text-sm text-text-secondary mb-4" aria-live="polite">
        {waitingLong
          ? 'Your opponent may have disconnected. The game will be resolved automatically.'
          : 'Your results are in. Sit tight!'}
      </p>

      {(waitingLong || hasSubmitError) && onLeave && (
        <button
          onClick={onLeave}
          className="mb-8 px-6 py-2 rounded-xl bg-text text-bg text-sm font-medium
            hover:scale-105 active:scale-95 transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Back to Lobby
        </button>
      )}

      <div className="bg-bg-secondary/50 rounded-2xl border border-text-secondary/10 p-5">
        <p className="text-xs text-text-secondary mb-3">Your Performance</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-2xl font-bold text-text tabular-nums">
              {myWpm}
            </span>
            <p className="text-xs text-text-secondary">WPM</p>
          </div>
          <div>
            <span className="text-2xl font-bold text-text tabular-nums">
              {myQuizScore}%
            </span>
            <p className="text-xs text-text-secondary">Quiz</p>
          </div>
          <div>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {myOverallScore}
            </span>
            <p className="text-xs text-text-secondary">Score</p>
          </div>
        </div>
      </div>
    </div>
  )
}
