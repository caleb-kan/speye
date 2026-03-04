import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import {
  eloChangeColor,
  formatEloChange,
  getTimeAgo,
  getMatchResult,
} from '../../../utils/pvp'
import { RESULT_BADGE } from '../../../constants/pvp'
import type { PvpMatchHistoryEntry } from '../../../types/database'

type PvpMatchHistoryProps = {
  matches: PvpMatchHistoryEntry[]
  loading: boolean
  error?: string | null
  currentUserId: string
  currentUsername?: string | null
  hoveredMatchId?: string | null
}

export function PvpMatchHistory({
  matches,
  loading,
  error,
  currentUserId,
  currentUsername,
  hoveredMatchId,
}: PvpMatchHistoryProps) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4 px-5 pt-5 shrink-0">
        <Clock size={18} className="text-primary" />
        <h2 className="text-lg font-semibold text-text">Recent Matches</h2>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-5">
        <MatchHistoryContent
          matches={matches}
          loading={loading}
          error={error}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          hoveredMatchId={hoveredMatchId}
        />
      </div>
    </>
  )
}

function MatchHistoryContent({
  matches,
  loading,
  error,
  currentUserId,
  currentUsername,
  hoveredMatchId,
}: PvpMatchHistoryProps) {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
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
      <div className="flex justify-center items-center h-full">
        <p role="alert" className="text-center text-error text-sm">
          {error}
        </p>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-center text-text-secondary text-sm">
          No Recent Matches
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1" role="list" aria-label="Recent matches">
      {matches.map((match) => (
        <MatchHistoryItem
          key={match.id}
          match={match}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          isExpanded={expandedMatchId === match.id}
          isHovered={hoveredMatchId === match.id}
          onToggleExpanded={() =>
            setExpandedMatchId(expandedMatchId === match.id ? null : match.id)
          }
        />
      ))}
    </div>
  )
}

function MatchHistoryItem({
  match,
  currentUserId,
  currentUsername,
  isExpanded,
  isHovered,
  onToggleExpanded,
}: {
  match: PvpMatchHistoryEntry
  currentUserId: string
  currentUsername?: string | null
  isExpanded: boolean
  isHovered: boolean
  onToggleExpanded: () => void
}) {
  const isForfeit = match.status === 'abandoned'
  const result = getMatchResult(match.winner_id, currentUserId, isForfeit)

  const { label: resultLabel, color: resultColor } = RESULT_BADGE[result]

  const timeAgo = getTimeAgo(match.created_at)

  return (
    <div
      role="listitem"
      className={`rounded-lg border overflow-hidden transition-colors hover:bg-text-secondary/5 ${
        isHovered
          ? 'bg-primary/20 border-primary/40'
          : 'border-text-secondary/5'
      }`}
    >
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center gap-2 p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        aria-expanded={isExpanded}
        aria-label={`Match vs ${match.opponent_username ?? 'Unknown'}`}
      >
        <span
          className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[10px] font-bold ${resultColor}`}
        >
          {resultLabel}
        </span>

        <span className="flex-1 text-xs text-text truncate min-w-0">
          vs {match.opponent_username ?? 'Unknown'}
        </span>

        {match.my_elo_change != null && (
          <span
            className={`text-xs font-semibold tabular-nums shrink-0 ${eloChangeColor(match.my_elo_change)}`}
          >
            {formatEloChange(match.my_elo_change)}
          </span>
        )}

        <span className="text-[10px] text-text-secondary shrink-0">
          {timeAgo}
        </span>

        <span className="shrink-0">
          {isExpanded ? (
            <ChevronUp size={12} className="text-text-secondary" />
          ) : (
            <ChevronDown size={12} className="text-text-secondary" />
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="px-2 pb-2 border-t border-text-secondary/5">
          <div className="grid grid-cols-2 gap-3 pt-2 text-[10px]">
            <div>
              <p className="text-text-secondary mb-0.5">
                {currentUsername || 'You'}
              </p>
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
              <p className="text-text-secondary mb-0.5">
                {match.opponent_username || 'Opponent'}
              </p>
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
            <p className="text-[10px] text-text-secondary mt-1.5 truncate">
              Text: {match.text_title}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
