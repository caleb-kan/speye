import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import {
  eloChangeColor,
  formatEloChange,
  getTimeAgo,
  getMatchResult,
} from '../../../utils/pvp'
import type { MatchResult } from '../../../utils/pvp'
import type { PvpMatchHistoryEntry } from '../../../types/database'

const RESULT_BADGE: Record<MatchResult, { label: string; color: string }> = {
  win: { label: 'W', color: 'text-success bg-success/10' },
  draw: { label: 'D', color: 'text-warning bg-warning/10' },
  loss: { label: 'L', color: 'text-error bg-error/10' },
}

type PvpMatchHistoryProps = {
  matches: PvpMatchHistoryEntry[]
  loading: boolean
  error?: string | null
  currentUserId: string
}

export function PvpMatchHistory({
  matches,
  loading,
  error,
  currentUserId,
}: PvpMatchHistoryProps) {
  return (
    <div className="bg-bg-secondary/50 rounded-2xl border border-text-secondary/10 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-primary" />
        <h2 className="text-lg font-semibold text-text">Recent Matches</h2>
      </div>

      <MatchHistoryContent
        matches={matches}
        loading={loading}
        error={error}
        currentUserId={currentUserId}
      />
    </div>
  )
}

function MatchHistoryContent({
  matches,
  loading,
  error,
  currentUserId,
}: PvpMatchHistoryProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading match history"
        />
      </div>
    )
  }

  if (error) {
    return (
      <p role="alert" className="text-center text-error py-8 text-sm">
        {error}
      </p>
    )
  }

  if (matches.length === 0) {
    return (
      <p className="text-center text-text-secondary py-8 text-sm">
        No matches played yet.
      </p>
    )
  }

  return (
    <div
      className="space-y-2 max-h-64 overflow-y-auto"
      role="list"
      aria-label="Recent matches"
    >
      {matches.map((match) => (
        <MatchHistoryItem
          key={match.id}
          match={match}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}

function MatchHistoryItem({
  match,
  currentUserId,
}: {
  match: PvpMatchHistoryEntry
  currentUserId: string
}) {
  const [expanded, setExpanded] = useState(false)

  const isForfeit = match.status === 'abandoned'
  const result = getMatchResult(match.winner_id, currentUserId, isForfeit)

  const { label: resultLabel, color: resultColor } = RESULT_BADGE[result]

  const timeAgo = getTimeAgo(match.created_at)

  return (
    <div
      role="listitem"
      className="rounded-lg border border-text-secondary/5 overflow-hidden transition-colors hover:bg-text-secondary/5"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        aria-expanded={expanded}
        aria-label={`Match vs ${match.opponent_username ?? 'Unknown'}`}
      >
        <span
          className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-xs font-bold ${resultColor}`}
        >
          {resultLabel}
        </span>

        <span className="flex-1 text-sm text-text truncate min-w-0">
          vs {match.opponent_username ?? 'Unknown'}
        </span>

        {match.my_elo_change != null && (
          <span
            className={`text-sm font-semibold tabular-nums shrink-0 ${eloChangeColor(match.my_elo_change)}`}
          >
            {formatEloChange(match.my_elo_change)}
          </span>
        )}

        <span className="text-xs text-text-secondary shrink-0">{timeAgo}</span>

        <span className="shrink-0">
          {expanded ? (
            <ChevronUp size={14} className="text-text-secondary" />
          ) : (
            <ChevronDown size={14} className="text-text-secondary" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-text-secondary/5">
          <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
            <div>
              <p className="text-text-secondary mb-1">You</p>
              {match.my_wpm != null && (
                <p className="text-text">
                  {match.my_wpm} WPM
                  {match.my_quiz_score != null && ` / ${match.my_quiz_score}%`}
                </p>
              )}
              {match.my_overall_score != null && (
                <p className="text-text font-medium">
                  Score: {match.my_overall_score}
                </p>
              )}
            </div>
            <div>
              <p className="text-text-secondary mb-1">Opponent</p>
              {match.opponent_wpm != null && (
                <p className="text-text">
                  {match.opponent_wpm} WPM
                  {match.opponent_quiz_score != null &&
                    ` / ${match.opponent_quiz_score}%`}
                </p>
              )}
              {match.opponent_overall_score != null && (
                <p className="text-text font-medium">
                  Score: {match.opponent_overall_score}
                </p>
              )}
            </div>
          </div>
          {match.text_title && (
            <p className="text-xs text-text-secondary mt-2 truncate">
              Text: {match.text_title}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
