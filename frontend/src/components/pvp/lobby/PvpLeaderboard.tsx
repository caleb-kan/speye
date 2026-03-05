import { Trophy } from 'lucide-react'
import { PvpRankBadge } from '../shared/PvpRankBadge'
import { computeWinRate } from '../../../utils/pvp'
import { PVP_LEADERBOARD_GRID_COLS } from '../../../constants/pvp'
import type {
  PvpLeaderboardEntry,
  PvpLeaderboardEntryWithRank,
} from '../../../types/database'

type PvpLeaderboardProps = {
  top: PvpLeaderboardEntry[]
  currentUser: PvpLeaderboardEntryWithRank | null
  loading: boolean
  error?: string | null
  currentUserId?: string
  onSelectUser?: (userId: string) => void
}

function EntryRow({
  entry,
  rank,
  isHighlighted,
  onSelect,
}: {
  entry: PvpLeaderboardEntry
  rank: number
  isHighlighted: boolean
  onSelect?: () => void
}) {
  const winRate = computeWinRate(entry.wins, entry.games_played)

  return (
    <button
      onClick={onSelect}
      className={`w-full grid ${PVP_LEADERBOARD_GRID_COLS} items-center gap-x-2 rounded-xl py-2 pl-1 pr-2 transition-colors ${
        isHighlighted
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-bg-secondary/50'
      }`}
      type="button"
    >
      <div className="text-sm text-text-secondary font-medium text-center">
        {rank}
      </div>
      <PvpRankBadge elo={entry.elo_rating} size="sm" />
      <div
        className={`text-sm truncate ${isHighlighted ? 'text-primary font-medium' : 'text-text'}`}
        title={entry.username ?? ''}
      >
        {entry.username ?? 'Unknown'}
      </div>
      <div className="text-sm font-semibold text-text text-right tabular-nums">
        {entry.elo_rating}
      </div>
      <div className="text-sm text-text text-right">
        {entry.wins}W {entry.losses}L
      </div>
      <div className="text-sm text-text-secondary text-right">{winRate}%</div>
    </button>
  )
}

function LeaderboardContent({
  top,
  currentUser,
  loading,
  error,
  currentUserId,
  onSelectUser,
}: PvpLeaderboardProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-sm text-text-secondary" role="status">
          Loading...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-sm text-error" role="alert">
          {error}
        </div>
      </div>
    )
  }

  if (top.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-sm text-text-secondary">
          No ranked players yet. Be the first!
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {top.map((entry, i) => (
        <EntryRow
          key={entry.user_id}
          entry={entry}
          rank={i + 1}
          isHighlighted={entry.user_id === currentUserId}
          onSelect={() => onSelectUser?.(entry.user_id)}
        />
      ))}

      {currentUser && !top.some((e) => e.user_id === currentUser.user_id) && (
        <>
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-text-secondary/20" />
            <span className="text-xs text-text-secondary">Your rank</span>
            <div className="flex-1 border-t border-text-secondary/20" />
          </div>
          <EntryRow
            entry={currentUser}
            rank={currentUser.rank}
            isHighlighted
            onSelect={() => onSelectUser?.(currentUser.user_id)}
          />
        </>
      )}
    </div>
  )
}

export function PvpLeaderboard({
  top,
  currentUser,
  loading,
  error,
  currentUserId,
  onSelectUser,
}: PvpLeaderboardProps) {
  return (
    <div className="w-full bg-bg-secondary/50 border border-text-secondary/10 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <Trophy size={18} className="text-primary" />
        <h3 className="text-lg font-semibold text-text">Elo Leaderboard</h3>
      </div>

      <div
        className={`grid ${PVP_LEADERBOARD_GRID_COLS} items-center text-xs uppercase tracking-wide text-text-secondary gap-x-2 pb-2 pl-1 pr-2 border-b border-text-secondary/10 flex-shrink-0`}
      >
        <div className="text-center">#</div>
        <div className="col-span-2">Player</div>
        <div className="text-right">Elo</div>
        <div className="text-right">W/L</div>
        <div className="text-right">Win%</div>
      </div>

      <div className="flex-1 min-h-0">
        <LeaderboardContent
          top={top}
          currentUser={currentUser}
          loading={loading}
          error={error}
          currentUserId={currentUserId}
          onSelectUser={onSelectUser}
        />
      </div>
    </div>
  )
}
