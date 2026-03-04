import { getRankFromElo } from '../../../utils/pvp'
import { GLOW_SPREAD, GLOW_LAYERS, GLOW_COLOR } from '../../../constants/pvp'

type PvpRankBadgeProps = {
  elo: number | null
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { fontSize: 'text-lg', badge: 'w-8 h-8' },
  md: { fontSize: 'text-3xl', badge: 'w-12 h-12' },
  lg: { fontSize: 'text-5xl', badge: 'w-20 h-20' },
}

function buildGlowFilter(color: string) {
  const min = Array.from(
    { length: GLOW_LAYERS },
    (_, i) => `drop-shadow(0 0 ${GLOW_SPREAD * (i + 1) * 0.5}px ${color})`
  ).join(' ')
  const max = Array.from(
    { length: GLOW_LAYERS },
    (_, i) => `drop-shadow(0 0 ${GLOW_SPREAD * (i + 1) * 1.5}px ${color})`
  ).join(' ')
  return { '--glow-min': min, '--glow-max': max } as React.CSSProperties
}

export function PvpRankBadge({ elo, size = 'md' }: PvpRankBadgeProps) {
  const s = sizes[size]

  if (elo === null) {
    return (
      <div
        className={`${s.badge} rounded-full flex items-center justify-center opacity-30`}
        role="img"
        aria-label="Rank unknown"
      >
        <span className={s.fontSize}>?</span>
      </div>
    )
  }

  const rank = getRankFromElo(elo)
  const glowColor = GLOW_COLOR[rank.level]
  const animate = glowColor && size !== 'sm'

  return (
    <div
      className={`${s.badge} rounded-full flex items-center justify-center relative ${animate ? 'rank-glow' : ''}`}
      role="img"
      aria-label={`${rank.tier} rank`}
      style={
        animate
          ? buildGlowFilter(glowColor)
          : glowColor
            ? { filter: `drop-shadow(0 0 8px ${glowColor})` }
            : undefined
      }
    >
      <span className={s.fontSize}>{rank.emoji}</span>
    </div>
  )
}
