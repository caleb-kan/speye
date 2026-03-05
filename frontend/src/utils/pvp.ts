import { MAX_QUIZ_SCORE } from '../../../lib/quizConstants'
import { RANK_TIERS } from '../constants/pvp'
import type { RankInfo, MatchResult } from '../constants/pvp'
import type { PvpGame } from '../types/database'

export function getRankFromElo(elo: number): RankInfo {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANK_TIERS[i].minElo) {
      return RANK_TIERS[i]
    }
  }
  return RANK_TIERS[0]
}

/** Format seconds as m:ss (e.g. 0:05, 1:30, 12:00). Assumes non-negative input. */
export function formatElapsedTime(totalSeconds: number): string {
  const total = Math.floor(totalSeconds)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function getProgressToNextTier(elo: number): number {
  const rank = getRankFromElo(elo)
  if (rank.maxElo === null) return 100
  const range = rank.maxElo - rank.minElo + 1
  const progress = elo - rank.minElo
  return Math.min(100, Math.round((progress / range) * 100))
}

export function computeWinRate(wins: number, gamesPlayed: number): number {
  return gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0
}

export function eloChangeColor(change: number): string {
  if (change > 0) return 'text-success'
  if (change < 0) return 'text-error'
  return 'text-text-secondary'
}

export function formatEloChange(change: number): string {
  return `${change > 0 ? '+' : ''}${change}`
}

export function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diff)) return '--'
  const mins = Math.floor(diff / (60 * 1000))
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function getMatchResult(
  winnerId: string | null,
  userId: string,
  isForfeit: boolean
): MatchResult {
  if (winnerId === userId) return 'win'
  if (!isForfeit && winnerId === null) return 'draw'
  return 'loss'
}

type PlayerPrefix = 'player1' | 'player2'

export function getPlayerPrefix(
  userId: string,
  player1Id: string
): { myPrefix: PlayerPrefix; oppPrefix: PlayerPrefix } {
  const isPlayer1 = player1Id === userId
  return isPlayer1
    ? { myPrefix: 'player1', oppPrefix: 'player2' }
    : { myPrefix: 'player2', oppPrefix: 'player1' }
}

export type PlayerGameData = {
  wpm: number | null
  quiz_score: number | null
  overall_score: number | null
  finished_at: string | null
  progress: number
  elo_before: number | null
  elo_change: number | null
  ready: boolean
}

export function getPlayerData(
  game: PvpGame,
  prefix: PlayerPrefix
): PlayerGameData {
  return {
    wpm: game[`${prefix}_wpm`],
    quiz_score: game[`${prefix}_quiz_score`],
    overall_score: game[`${prefix}_overall_score`],
    finished_at: game[`${prefix}_finished_at`],
    progress: game[`${prefix}_progress`],
    elo_before: game[`${prefix}_elo_before`],
    elo_change: game[`${prefix}_elo_change`],
    ready: game[`${prefix}_ready`],
  }
}

export type PendingSubmit = { wpm: number; score: number }

export function readPendingSubmit(
  gameId: string,
  prefix: string
): PendingSubmit | null {
  try {
    const stored = sessionStorage.getItem(`${prefix}${gameId}`)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (
      Number.isFinite(parsed?.wpm) &&
      Number.isFinite(parsed?.score) &&
      parsed.wpm >= 0 &&
      parsed.score >= 0 &&
      parsed.score <= MAX_QUIZ_SCORE
    ) {
      return parsed
    }
    console.error('Invalid PvP submit shape in sessionStorage:', parsed)
    clearPendingSubmit(gameId, prefix)
  } catch (err) {
    console.error('Failed to read PvP submit from sessionStorage:', err)
    clearPendingSubmit(gameId, prefix)
  }
  return null
}

export function writePendingSubmit(
  gameId: string,
  prefix: string,
  data: PendingSubmit
): boolean {
  try {
    sessionStorage.setItem(`${prefix}${gameId}`, JSON.stringify(data))
    return true
  } catch (err) {
    console.error('Failed to persist PvP submit to sessionStorage:', err)
    return false
  }
}

export function clearPendingSubmit(gameId: string, prefix: string): void {
  try {
    sessionStorage.removeItem(`${prefix}${gameId}`)
  } catch (err) {
    console.error('Failed to clear PvP submit from sessionStorage:', err)
  }
}
