import { useEffect, useState } from 'react'
import {
  SMALL_CIRCLE_THRESHOLD,
  DEFAULT_CIRCLE_SIZE,
  DEFAULT_STROKE_WIDTH,
  CIRCLE_ANIMATION_DELAY_MS,
} from '../../constants/quiz'

type Props = {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}

export function CircularProgress({
  percentage,
  size = DEFAULT_CIRCLE_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  color = 'text-primary',
}: Props) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(
      () => setProgress(percentage),
      CIRCLE_ANIMATION_DELAY_MS
    )
    return () => clearTimeout(timer)
  }, [percentage])

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  const isSmall = size <= SMALL_CIRCLE_THRESHOLD
  const percentClass = isSmall ? 'text-xl' : 'text-4xl'
  const labelClass = isSmall ? 'text-[10px] mt-0.5' : 'text-sm mt-1'

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-text-secondary/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`${percentClass} font-bold tracking-tighter text-text animate-in fade-in zoom-in duration-500 delay-100`}
        >
          {progress}%
        </span>
        <span
          className={`${labelClass} font-medium text-text-secondary uppercase tracking-wider`}
        >
          Accuracy
        </span>
      </div>
    </div>
  )
}
