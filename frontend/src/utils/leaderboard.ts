import type { LeaderboardEntry } from '../services/leaderboardService'

export type MergedLeaderboard = {
  top: LeaderboardEntry[]
  currentUser: LeaderboardEntry | null
}

/**
 * Merges an optimistic local entry with server leaderboard data.
 * Returns the top N entries and the current user entry (if outside top N).
 */
export function mergeLocalEntry(
  topEntries: LeaderboardEntry[],
  localEntry: LeaderboardEntry,
  topCount: number
): MergedLeaderboard {
  const userId = localEntry.userId

  // Remove existing entry for this user from top entries
  const others = topEntries.filter((e) => e.userId !== userId)

  // Merge, sort by overall score descending, and assign ranks immutably
  const ranked = [...others, localEntry]
    .sort((a, b) => b.overallScore - a.overallScore)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  const userIdx = ranked.findIndex((e) => e.userId === userId)
  const top = ranked.slice(0, topCount)
  const currentUser = userIdx >= topCount ? ranked[userIdx] : null

  return { top, currentUser }
}
