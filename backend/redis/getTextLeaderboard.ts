import { logDbQuery } from '../supabase/database/logger'
import { MAX_QUIZ_SCORE } from '../../lib/quizConstants'
import type { LeaderboardEntry } from './types'

const UPSTASH_REST_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL as string
const UPSTASH_READ_TOKEN = import.meta.env
  .VITE_UPSTASH_REDIS_REST_READ_TOKEN as string

const LEADERBOARD_TOP_COUNT = 5
const REDIS_REQUEST_TIMEOUT_MS = 3000

/**
 * Execute Upstash REST pipeline commands using the read-only token.
 */
async function redisPipeline<T>(commands: string[][]): Promise<T[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REDIS_REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${UPSTASH_REST_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_READ_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Redis request failed: ${res.status}`)
    }

    const data = (await res.json()) as { result: T; error?: string }[]
    if (!Array.isArray(data) || data.length !== commands.length) {
      throw new Error('Invalid Redis pipeline response')
    }
    return data.map((entry) => {
      if (entry?.error) throw new Error(entry.error)
      if (!entry || !Object.hasOwn(entry, 'result')) {
        throw new Error('Invalid Redis pipeline response')
      }
      return entry.result
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Convert a flat Redis HGETALL array [key, val, key, val, ...]
 * into a Record<string, string>.
 */
function parseHashArray(arr: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i += 2) {
      result[arr[i]] = arr[i + 1]
    }
  }
  return result
}

function parseOverallScore(value: unknown): number {
  const score = Number(value)
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    value === '' ||
    !Number.isFinite(score) ||
    score < 0
  ) {
    throw new Error('Invalid cached leaderboard ranking')
  }
  return score
}

function buildEntry(
  userId: string,
  stats: Record<string, string>,
  overallScore: number,
  rank: number
): LeaderboardEntry {
  const wpm = Number(stats.wpm)
  const quizScore = Number(stats.quizScore)
  if (
    !stats.wpm ||
    !stats.quizScore ||
    !stats.overallScore ||
    Number(stats.overallScore) !== overallScore ||
    !Number.isFinite(wpm) ||
    wpm < 0 ||
    !Number.isFinite(quizScore) ||
    quizScore < 0 ||
    quizScore > MAX_QUIZ_SCORE
  ) {
    throw new Error('Invalid cached leaderboard stats')
  }
  return {
    userId,
    username: stats.username || null,
    avatarUrl: stats.avatarUrl || null,
    wpm,
    quizScore,
    overallScore,
    rank,
  }
}

/**
 * Fetch the top leaderboard entries for a text directly from Upstash Redis.
 * Also returns the current user's entry if they're not in the top entries.
 */
export async function getTextLeaderboard(
  textId: string,
  currentUserId?: string
): Promise<{ top: LeaderboardEntry[]; currentUser: LeaderboardEntry | null }> {
  if (!textId) {
    throw new Error('Text ID is required')
  }

  const lastIndex = String(LEADERBOARD_TOP_COUNT - 1)
  const [raw] = await redisPipeline<(string | number)[]>([
    ['ZREVRANGE', `lb:${textId}`, '0', lastIndex, 'WITHSCORES'],
  ])

  logDbQuery({ table: 'redis:lb', action: 'ZREVRANGE' })

  if (!Array.isArray(raw) || raw.length % 2 !== 0) {
    throw new Error('Invalid cached leaderboard ranking')
  }
  if (raw.length === 0) {
    return { top: [], currentUser: null }
  }

  const userIds: string[] = []
  const overallScores: number[] = []
  for (let i = 0; i < raw.length; i += 2) {
    const userId = raw[i]
    if (typeof userId !== 'string' || !userId) {
      throw new Error('Invalid cached leaderboard ranking')
    }
    userIds.push(userId)
    overallScores.push(parseOverallScore(raw[i + 1]))
  }

  const statCommands = userIds.map((uid) => [
    'HGETALL',
    `lb_stats:${textId}:${uid}`,
  ])
  const statsResults = await redisPipeline<string[]>(statCommands)

  logDbQuery({ table: 'redis:lb_stats', action: 'HGETALL (pipeline)' })

  const top: LeaderboardEntry[] = userIds.map((userId, i) => {
    const stats = parseHashArray(statsResults[i])
    return buildEntry(userId, stats, overallScores[i], i + 1)
  })

  let currentUser: LeaderboardEntry | null = null
  if (currentUserId && !userIds.includes(currentUserId)) {
    const [rank, score] = await redisPipeline<number | string | null>([
      ['ZREVRANK', `lb:${textId}`, currentUserId],
      ['ZSCORE', `lb:${textId}`, currentUserId],
    ])

    if (rank !== null || score !== null) {
      if (typeof rank !== 'number' || !Number.isSafeInteger(rank) || rank < 0) {
        throw new Error('Invalid cached leaderboard ranking')
      }
      const overallScore = parseOverallScore(score)
      const [statsArr] = await redisPipeline<string[]>([
        ['HGETALL', `lb_stats:${textId}:${currentUserId}`],
      ])
      const stats = parseHashArray(statsArr)
      currentUser = buildEntry(currentUserId, stats, overallScore, rank + 1)
    }

    logDbQuery({
      table: 'redis:lb',
      action: 'ZREVRANK+ZSCORE (current user)',
    })
  }

  return { top, currentUser }
}
