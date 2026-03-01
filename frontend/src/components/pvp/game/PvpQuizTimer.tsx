import { useEffect, useRef, useState } from 'react'
import { useRefSync } from '../../../hooks/useRefSync'
import { PVP_QUIZ_TIMER_TICK_MS } from '../../../constants/pvp'

const CIRCLE_RADIUS = 42
const WARNING_FRACTION = 0.5
const DANGER_FRACTION = 0.25

type PvpQuizTimerProps = {
  durationSeconds: number
  onExpire: () => void
  resetKey: number
}

export function PvpQuizTimer({
  durationSeconds,
  onExpire,
  resetKey,
}: PvpQuizTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const startRef = useRef(0)
  const onExpireRef = useRefSync(onExpire)

  useEffect(() => {
    startRef.current = Date.now()
    // Derived state reset: timer must restart when resetKey changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(durationSeconds)

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000
      const left = Math.max(0, durationSeconds - elapsed)
      setRemaining(left)

      if (left <= 0) {
        clearInterval(interval)
        onExpireRef.current()
      }
    }, PVP_QUIZ_TIMER_TICK_MS)

    return () => clearInterval(interval)
  }, [durationSeconds, resetKey, onExpireRef])

  const fraction = durationSeconds > 0 ? remaining / durationSeconds : 0
  const circumference = 2 * Math.PI * CIRCLE_RADIUS
  const offset = circumference * (1 - fraction)

  let strokeColor: string
  if (fraction > WARNING_FRACTION) {
    strokeColor = 'var(--color-primary)'
  } else if (fraction > DANGER_FRACTION) {
    strokeColor = 'var(--color-warning, #EAB308)'
  } else {
    strokeColor = 'var(--color-error, #EF4444)'
  }

  return (
    <div
      className="relative w-14 h-14 flex items-center justify-center"
      role="timer"
      aria-live="off"
      aria-label={`${Math.ceil(remaining)} seconds remaining`}
    >
      <svg width="56" height="56" viewBox="0 0 96 96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-text-secondary/10"
        />
        <circle
          cx="48"
          cy="48"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-colors duration-300"
        />
      </svg>
      <span className="absolute text-sm font-bold text-text tabular-nums">
        {Math.ceil(remaining)}
      </span>
    </div>
  )
}
