type PvpProgressBarProps = {
  percent: number
  variant?: 'primary' | 'opponent'
  label?: string
}

export function PvpProgressBar({
  percent,
  variant = 'primary',
  label,
}: PvpProgressBarProps) {
  const bgClass = variant === 'primary' ? 'bg-primary' : 'bg-text-secondary/40'

  return (
    <div className="flex-1 min-w-0">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-secondary truncate">{label}</span>
          <span className="text-xs text-text-secondary tabular-nums">
            {percent}%
          </span>
        </div>
      )}
      <div
        className="h-2 rounded-full bg-text-secondary/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          label
            ? `${label}: ${Math.round(percent)}%`
            : `Progress: ${Math.round(percent)}%`
        }
      >
        <div
          className={`h-full rounded-full ${bgClass} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  )
}
