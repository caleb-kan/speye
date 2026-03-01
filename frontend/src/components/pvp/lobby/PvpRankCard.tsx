import { Swords } from 'lucide-react'
import { PvpRankBadge } from '../shared/PvpRankBadge'
import { EloDisplay } from '../shared/EloDisplay'
import { PVP_STARTING_ELO } from '../../../constants/pvp'
import {
  getRankFromElo,
  getProgressToNextTier,
  computeWinRate,
} from '../../../utils/pvp'
import type { PvpRating } from '../../../types/database'

type PvpRankCardProps = {
  rating: PvpRating | null
  loading: boolean
  ratingError?: boolean
  onPlayRanked: () => void
}

export function PvpRankCard({
  rating,
  loading,
  ratingError,
  onPlayRanked,
}: PvpRankCardProps) {
  const elo = rating?.elo_rating ?? PVP_STARTING_ELO
  const gamesPlayed = rating?.games_played ?? 0
  const rank = getRankFromElo(elo)
  const progress = getProgressToNextTier(elo)

  return (
    <div className="flex flex-col items-center gap-5">
      <PvpRankBadge elo={elo} size="lg" />

      <div className="text-center">
        <span className="text-sm font-semibold" style={{ color: rank.color }}>
          {rank.tier}
        </span>
        <div className="mt-1">
          {ratingError ? (
            <span className="text-sm text-text-secondary">
              Rating unavailable
            </span>
          ) : (
            <EloDisplay elo={elo} size="lg" />
          )}
        </div>

        {rank.maxElo !== null && (
          <div className="mt-3 w-48 mx-auto">
            <div className="h-1.5 rounded-full bg-text-secondary/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: rank.color,
                }}
              />
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {Math.max(0, rank.maxElo + 1 - elo)} to{' '}
              {getRankFromElo(rank.maxElo + 1).tier}
            </p>
          </div>
        )}
      </div>

      {rating && gamesPlayed > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
            {rating.wins}W
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-error/10 text-error font-medium">
            {rating.losses}L
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-text-secondary/10 text-text-secondary font-medium">
            {rating.draws}D
          </span>
          <span className="text-xs text-text-secondary">
            {computeWinRate(rating.wins, gamesPlayed)}% win rate
          </span>
        </div>
      )}

      <button
        onClick={onPlayRanked}
        disabled={loading || ratingError}
        className="
          px-10 py-3.5 rounded-xl
          bg-text text-bg font-semibold text-base
          hover:bg-success hover:text-bg hover:shadow-[0_0_20px_var(--color-success)]
          hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-300
          flex items-center justify-center gap-2
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
        "
      >
        <Swords size={20} />
        Play Ranked
      </button>
    </div>
  )
}
