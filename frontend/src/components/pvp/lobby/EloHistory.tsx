import { HistoryGraph } from '../shared/HistoryGraph'
import type { PvpMatchHistoryEntry } from '../../../types/database'
import type { RankInfo } from '../../../constants/pvp'
import { GLOW_COLOR } from '../../../constants/pvp'

type MatchEloPoint = {
  match_id: string
  game_date: string
  elo_rating: number
}

type EloHistoryProps = {
  matches: PvpMatchHistoryEntry[]
  loading: boolean
  error?: string | null
  username?: string | null
  rank?: RankInfo | null
  currentElo?: number | null
  onHoverMatchId?: (matchId: string | null) => void
}

function toMatchEloPoints(matches: PvpMatchHistoryEntry[]): MatchEloPoint[] {
  return [...matches]
    .filter(
      (match) => match.my_elo_before !== null && match.my_elo_change !== null
    )
    .sort(
      (a, b) =>
        new Date(a.finished_at ?? a.created_at).getTime() -
        new Date(b.finished_at ?? b.created_at).getTime()
    )
    .map((match) => ({
      match_id: match.id,
      game_date: match.finished_at ?? match.created_at,
      elo_rating: (match.my_elo_before ?? 0) + (match.my_elo_change ?? 0),
    }))
}

export function EloHistory({
  matches,
  loading,
  error,
  username,
  rank,
  currentElo,
  onHoverMatchId,
}: EloHistoryProps) {
  const history = toMatchEloPoints(matches)

  return (
    <>
      {username && (
        <div className="mb-3 text-sm text-text-secondary flex items-start justify-between">
          <div>
            Player: <span className="text-text font-medium">{username}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            {currentElo !== null && currentElo !== undefined && (
              <span className="text-text font-medium">
                <span className="text-text-secondary">Elo: </span>
                {currentElo}
              </span>
            )}
            {rank && (
              <div className="flex items-center gap-2">
                <span
                  style={
                    GLOW_COLOR[rank.level]
                      ? {
                          filter: `drop-shadow(0 0 8px ${GLOW_COLOR[rank.level]})`,
                        }
                      : undefined
                  }
                >
                  {rank.emoji}
                </span>
                <span
                  className="text-text font-medium"
                  style={{ color: rank.color }}
                >
                  {rank.tier}
                </span>
              </div>
            )}
            {!rank && currentElo == null && (
              <div className="text-text-secondary text-sm">-</div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        {loading && (
          <div className="text-sm text-text-secondary" role="status">
            Loading...
          </div>
        )}

        {error && (
          <div className="text-sm text-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="w-full h-[200px]">
            <HistoryGraph<MatchEloPoint>
              data={history}
              dateKey="game_date"
              valueKey="elo_rating"
              unit="elo"
              onHoverDataPoint={(dataPoint) =>
                onHoverMatchId?.(dataPoint?.match_id ?? null)
              }
            />
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="text-center text-text-secondary text-sm">
            No Elo History
          </div>
        )}
      </div>
    </>
  )
}
