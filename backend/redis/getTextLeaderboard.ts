import { logDbQuery } from '../supabase/database/logger'
import type { LeaderboardEntry } from './types'

const UPSTASH_REST_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL as string
const UPSTASH_READ_TOKEN = import.meta.env
  .VITE_UPSTASH_REDIS_REST_READ_TOKEN as string

const LEADERBOARD_TOP_COUNT = 5

/**
 * Execute Upstash REST pipeline commands using the read-only token.
 */
async function redisPipeline<T>(commands: string[][]): Promise<T[]> {
  const res = await fetch(`${UPSTASH_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_READ_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!res.ok) {
    throw new Error(`Redis request failed: ${res.status}`)
  }

  const data = (await res.json()) as { result: T }[]
  return data.map((d) => d.result)
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

/**
 * Build a LeaderboardEntry from parsed hash stats.
 */
function buildEntry(
  userId: string,
  stats: Record<string, string>,
  overallScore: number,
  rank: number
): LeaderboardEntry {
  return {
    userId,
    wpm: Number(stats.wpm) || 0,
    quizScore: Number(stats.quizScore) || 0,
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

  if (!raw || raw.length === 0) {
    return { top: [], currentUser: null }
  }

  const userIds: string[] = []
  const overallScores: number[] = []
  for (let i = 0; i < raw.length; i += 2) {
    userIds.push(String(raw[i]))
    overallScores.push(Number(raw[i + 1]))
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
    const [rank, score] = await redisPipeline<number | null>([
      ['ZREVRANK', `lb:${textId}`, currentUserId],
      ['ZSCORE', `lb:${textId}`, currentUserId],
    ])

    if (rank !== null && score !== null) {
      const [statsArr] = await redisPipeline<string[]>([
        ['HGETALL', `lb_stats:${textId}:${currentUserId}`],
      ])
      const stats = parseHashArray(statsArr)
      currentUser = buildEntry(
        currentUserId,
        stats,
        Number(score),
        Number(rank) + 1
      )
    }

    logDbQuery({
      table: 'redis:lb',
      action: 'ZREVRANK+ZSCORE (current user)',
    })
  }

  return { top, currentUser }
}
