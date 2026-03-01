import { Shield } from 'lucide-react'
import { getRankFromElo } from '../../../utils/pvp'

const GLOW_PX = 8

type PvpRankBadgeProps = {
  elo: number | null
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { icon: 16, badge: 'w-6 h-6' },
  md: { icon: 24, badge: 'w-10 h-10' },
  lg: { icon: 40, badge: 'w-16 h-16' },
}

export function PvpRankBadge({ elo, size = 'md' }: PvpRankBadgeProps) {
  const s = sizes[size]

  if (elo === null) {
    return (
      <div
        className={`${s.badge} rounded-xl flex items-center justify-center`}
        role="img"
        aria-label="Rank unknown"
      >
        <Shield
          size={s.icon}
          className="text-text-secondary/30"
          strokeWidth={1.5}
        />
      </div>
    )
  }

  const rank = getRankFromElo(elo)

  return (
    <div
      className={`${s.badge} rounded-xl flex items-center justify-center relative`}
      role="img"
      aria-label={`${rank.tier} rank`}
      style={{
        filter: `drop-shadow(0 0 ${GLOW_PX}px ${rank.color})`,
      }}
    >
      <Shield
        size={s.icon}
        style={{ color: rank.color }}
        fill={rank.color}
        strokeWidth={1.5}
        className="opacity-90"
      />
    </div>
  )
}
