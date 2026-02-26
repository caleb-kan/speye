import { DefaultAvatar } from '../DefaultAvatar'
import type { LeaderboardEntry } from '../../services/leaderboardService'

type Props = {
  topEntries: LeaderboardEntry[]
  currentUserEntry: LeaderboardEntry | null
  currentUserId?: string
  isLoading: boolean
  loadError: string | null
}

const GRID_COLS = 'grid-cols-[20px_28px_1fr_60px_60px_60px]'

function formatWpm(value: number) {
  if (!Number.isFinite(value)) return '-'
  return Math.round(value).toString()
}

function formatQuizScore(value: number) {
  if (!Number.isFinite(value)) return '-'
  return `${Math.round(value)}%`
}

function formatOverallScore(value: number) {
  if (!Number.isFinite(value)) return '-'
  return Math.round(value).toString()
}

function EntryRow({
  entry,
  isHighlighted,
}: {
  entry: LeaderboardEntry
  isHighlighted: boolean
}) {
  return (
    <div
      className={`grid ${GRID_COLS} items-center gap-x-2 gap-y-0 rounded-xl py-2 pl-1 pr-2 transition-colors ${
        isHighlighted
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-bg-secondary/50'
      }`}
    >
      <div className="text-sm text-text-secondary font-medium text-center">
        {entry.rank}
      </div>
      <div className="w-7 h-7 rounded-full overflow-hidden border border-text-secondary/20">
        <DefaultAvatar
          username={entry.username ?? undefined}
          avatarUrl={entry.avatarUrl ?? undefined}
          size="sm"
        />
      </div>
      <div className="text-sm text-text truncate" title={entry.username ?? ''}>
        {entry.username ?? ''}
      </div>
      <div className="text-sm text-text text-right">{formatWpm(entry.wpm)}</div>
      <div className="text-sm text-text text-right">
        {formatQuizScore(entry.quizScore)}
      </div>
      <div
        className="text-sm text-text text-right"
        title="Combines reading speed and comprehension"
      >
        {formatOverallScore(entry.overallScore)}
      </div>
    </div>
  )
}

export function LeaderboardTable({
  topEntries,
  currentUserEntry,
  currentUserId,
  isLoading,
  loadError,
}: Props) {
  const isCurrentUser = (userId: string) => currentUserId === userId

  return (
    <div className="w-full bg-bg-secondary/50 border border-text-secondary/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">Leaderboard</h3>
      </div>

      <div
        className={`grid ${GRID_COLS} items-center text-xs uppercase tracking-wide text-text-secondary gap-x-2 pb-2 pl-1 pr-2 border-b border-text-secondary/10`}
      >
        <div className="text-center">#</div>
        <div className="col-span-2">User</div>
        <div className="text-right">WPM</div>
        <div className="text-right">Quiz</div>
        <div
          className="text-right"
          title="Combines reading speed and comprehension"
        >
          Score
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <div className="text-sm text-text-secondary">Loading...</div>
        ) : loadError ? (
          <div className="text-sm text-text-secondary">{loadError}</div>
        ) : topEntries.length === 0 ? (
          <div className="text-sm text-text-secondary">
            No leaderboard entries yet.
          </div>
        ) : (
          <>
            {topEntries.map((entry) => (
              <EntryRow
                key={entry.userId}
                entry={entry}
                isHighlighted={isCurrentUser(entry.userId)}
              />
            ))}

            {currentUserEntry && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 border-t border-text-secondary/20" />
                  <span className="text-xs text-text-secondary">Your rank</span>
                  <div className="flex-1 border-t border-text-secondary/20" />
                </div>
                <EntryRow entry={currentUserEntry} isHighlighted />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
