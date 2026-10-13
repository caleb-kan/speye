import { MAX_QUIZ_SCORE } from '../../../lib/quizConstants'
import { RANK_TIERS, PVP_SUBMIT_STORAGE_PREFIX } from '../constants/pvp'
import { MAX_WPM } from '../constants/wpm'
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

type PlayerGameData = {
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
  userId: string
): PendingSubmit | null {
  try {
    sessionStorage.removeItem(`${PVP_SUBMIT_STORAGE_PREFIX}${gameId}`)
    const stored = sessionStorage.getItem(
      `${PVP_SUBMIT_STORAGE_PREFIX}${gameId}:${userId}`
    )
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (
      parsed?.gameId === gameId &&
      parsed.userId === userId &&
      Number.isFinite(parsed.wpm) &&
      Number.isFinite(parsed.score) &&
      parsed.wpm >= 0 &&
      parsed.score >= 0 &&
      parsed.score <= MAX_QUIZ_SCORE
    ) {
      return { wpm: parsed.wpm, score: parsed.score }
    }
    console.error('Invalid PvP submit shape in sessionStorage:', parsed)
    clearPendingSubmit(gameId, userId)
  } catch (err) {
    console.error('Failed to read PvP submit from sessionStorage:', err)
    clearPendingSubmit(gameId, userId)
  }
  return null
}

export function writePendingSubmit(
  gameId: string,
  userId: string,
  data: PendingSubmit
): boolean {
  try {
    sessionStorage.setItem(
      `${PVP_SUBMIT_STORAGE_PREFIX}${gameId}:${userId}`,
      JSON.stringify({ ...data, gameId, userId })
    )
    return true
  } catch (err) {
    console.error('Failed to persist PvP submit to sessionStorage:', err)
    return false
  }
}

export function clearPendingSubmit(gameId: string, userId: string): void {
  try {
    sessionStorage.removeItem(`${PVP_SUBMIT_STORAGE_PREFIX}${gameId}:${userId}`)
    sessionStorage.removeItem(`${PVP_SUBMIT_STORAGE_PREFIX}${gameId}`)
  } catch (err) {
    console.error('Failed to clear PvP submit from sessionStorage:', err)
  }
}

export type PvpReadingSession = {
  wordIndex: number
  readingStartedAt: string | null
  gameStartedAt: number | null
  completedWpm: number | null
}

export function readPvpReadingSession(
  gameId: string,
  userId: string,
  totalWords: number
): PvpReadingSession | null {
  try {
    const stored = sessionStorage.getItem(
      `${PVP_SUBMIT_STORAGE_PREFIX}reading:${gameId}:${userId}`
    )
    if (!stored) return null
    const parsed = JSON.parse(stored)
    const readingStartedAt =
      typeof parsed?.readingStartedAt === 'string'
        ? Date.parse(parsed.readingStartedAt)
        : NaN
    if (
      Number.isInteger(parsed?.wordIndex) &&
      parsed.wordIndex >= 0 &&
      parsed.wordIndex <= totalWords &&
      (parsed.readingStartedAt === null ||
        (Number.isFinite(readingStartedAt) &&
          readingStartedAt >= 0 &&
          readingStartedAt <= Date.now())) &&
      (parsed.gameStartedAt === null ||
        (Number.isFinite(parsed.gameStartedAt) &&
          parsed.gameStartedAt >= 0 &&
          parsed.gameStartedAt <= Date.now())) &&
      (parsed.completedWpm === null ||
        (Number.isFinite(parsed.completedWpm) &&
          parsed.completedWpm > 0 &&
          parsed.completedWpm <= MAX_WPM &&
          parsed.wordIndex === totalWords))
    )
      return parsed
    clearPvpReadingSession(gameId, userId)
  } catch (err) {
    console.error('Failed to read PvP reading session:', err)
    clearPvpReadingSession(gameId, userId)
  }
  return null
}

export function writePvpReadingSession(
  gameId: string,
  userId: string,
  data: PvpReadingSession
): void {
  try {
    sessionStorage.setItem(
      `${PVP_SUBMIT_STORAGE_PREFIX}reading:${gameId}:${userId}`,
      JSON.stringify(data)
    )
  } catch (err) {
    console.error('Failed to persist PvP reading session:', err)
  }
}

export function clearPvpReadingSession(gameId: string, userId: string): void {
  try {
    sessionStorage.removeItem(
      `${PVP_SUBMIT_STORAGE_PREFIX}reading:${gameId}:${userId}`
    )
  } catch (err) {
    console.error('Failed to clear PvP reading session:', err)
  }
}
