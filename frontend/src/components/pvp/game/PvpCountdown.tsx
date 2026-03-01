import { useState, useEffect } from 'react'
import { useRefSync } from '../../../hooks/useRefSync'
import {
  PVP_COUNTDOWN_S,
  PVP_COUNTDOWN_TICK_MS,
  PVP_COUNTDOWN_GO_DISPLAY_MS,
} from '../../../constants/pvp'

type PvpCountdownProps = {
  startTime: number
  onComplete: () => void
}

export function PvpCountdown({ startTime, onComplete }: PvpCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(PVP_COUNTDOWN_S)
  const onCompleteRef = useRefSync(onComplete)

  useEffect(() => {
    // Syncing state with prop: initial countdown calculation
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecondsLeft(Math.max(0, Math.ceil((startTime - Date.now()) / 1000)))

    let goTimeout: ReturnType<typeof setTimeout> | null = null

    const interval = setInterval(() => {
      const remaining = Math.ceil((startTime - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(interval)
        setSecondsLeft(0)
        // Delay transition so the "GO!" frame paints before the phase
        // change unmounts this component.
        goTimeout = setTimeout(
          () => onCompleteRef.current(),
          PVP_COUNTDOWN_GO_DISPLAY_MS
        )
      } else {
        setSecondsLeft(remaining)
      }
    }, PVP_COUNTDOWN_TICK_MS)

    return () => {
      clearInterval(interval)
      if (goTimeout) clearTimeout(goTimeout)
    }
  }, [startTime, onCompleteRef])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-lg text-text-secondary mb-4">Get ready!</p>
        <div aria-live="polite" aria-atomic="true">
          <div
            key={secondsLeft}
            className="animate-in zoom-in fade-in duration-300"
          >
            <span className="text-8xl font-black text-primary tabular-nums">
              {secondsLeft === 0 ? 'GO!' : secondsLeft}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
