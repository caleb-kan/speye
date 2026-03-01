import { eloChangeColor, formatEloChange } from '../../../utils/pvp'

type EloDisplayProps = {
  elo: number | null
  change?: number | null
  size?: 'sm' | 'md' | 'lg'
}

const textSizes = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-4xl',
}

export function EloDisplay({ elo, change, size = 'md' }: EloDisplayProps) {
  return (
    <div className="flex items-baseline justify-center gap-2">
      <span className={`${textSizes[size]} font-bold text-text tabular-nums`}>
        {elo ?? '--'}
      </span>
      {change != null && change !== 0 && (
        <span
          className={`text-sm font-semibold tabular-nums ${eloChangeColor(change)}`}
        >
          {formatEloChange(change)}
        </span>
      )}
    </div>
  )
}
