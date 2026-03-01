import { PvpProgressBar } from '../shared/PvpProgressBar'
import { formatElapsedTime } from '../../../utils/pvp'

type PvpOpponentBarProps = {
  myProgress: number
  opponentProgress: number
  myUsername: string
  opponentUsername: string
  elapsedSeconds: number
  opponentDisconnected: boolean
}

export function PvpOpponentBar({
  myProgress,
  opponentProgress,
  myUsername,
  opponentUsername,
  elapsedSeconds,
  opponentDisconnected,
}: PvpOpponentBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-sm px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      role="region"
      aria-label="Game progress"
    >
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <div className="flex-1">
          <PvpProgressBar
            percent={myProgress}
            variant="primary"
            label={myUsername}
          />
        </div>

        <div className="text-center shrink-0">
          <span className="text-xs text-text-secondary tabular-nums">
            {formatElapsedTime(elapsedSeconds)}
          </span>
        </div>

        <div className="flex-1">
          <PvpProgressBar
            percent={opponentProgress}
            variant="opponent"
            label={
              opponentDisconnected
                ? `${opponentUsername} (disconnected)`
                : opponentUsername
            }
          />
        </div>
      </div>
    </div>
  )
}
