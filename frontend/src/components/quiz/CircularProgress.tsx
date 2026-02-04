import { useEffect, useState } from 'react'

type Props = {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}

export function CircularProgress({
  percentage,
  size = 200,
  strokeWidth = 12,
  color = 'text-primary',
}: Props) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(percentage), 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/5"
        />
        {/* Progress Circle */}
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

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tighter text-white animate-in fade-in zoom-in duration-500 delay-100">
          {progress}%
        </span>
        <span className="text-sm font-medium text-text-secondary uppercase tracking-wider mt-1">
          Accuracy
        </span>
      </div>
    </div>
  )
}
