import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Redis } from 'npm:@upstash/redis'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
})

const LB_TTL = 60 * 60 * 24 * 7 // 7 days

// Scoring formula duplicated from lib/scoring.ts because Deno edge functions
// cannot import from the shared lib/ directory. Keep in sync manually.
// See lib/scoring.ts for full documentation. See also lib/quizConstants.ts.
const NUM_OPTIONS_PER_QUESTION = 4
const MAX_QUIZ_SCORE = 100
const CHANCE_RATE = 1 / NUM_OPTIONS_PER_QUESTION
const COMPREHENSION_EXPONENT = 1.5
const SPEED_EXPONENT = 0.7
const SCORE_SCALE = 10

function computeOverallScore(wpm: number, quizScore: number): number {
  if (!Number.isFinite(wpm) || !Number.isFinite(quizScore)) return 0
  if (wpm <= 0 || quizScore <= 0) return 0
  const rawAccuracy = quizScore / MAX_QUIZ_SCORE
  const adjustedAccuracy = Math.max(
    0,
    (rawAccuracy - CHANCE_RATE) / (1 - CHANCE_RATE)
  )
  if (adjustedAccuracy <= 0) return 0
  const comprehensionFactor = Math.pow(adjustedAccuracy, COMPREHENSION_EXPONENT)
  const speedFactor = Math.pow(wpm, SPEED_EXPONENT)
  return Math.round(speedFactor * comprehensionFactor * SCORE_SCALE)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

type RequestBody = {
  text_id?: string
  user_id?: string
  action?: 'update'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAvatarUrl(user: any): string | null {
  const metadata = user?.user_metadata
  const identityData = user?.identities?.[0]?.identity_data
  return (
    metadata?.avatar_url ??
    metadata?.picture ??
    identityData?.picture ??
    identityData?.avatar_url ??
    null
  )
}

/**
 * For a given text, compute each user's best entry from user_activity.
 * Best = highest computeOverallScore(wpm, score). Returns one entry per user.
 */
async function computeBestPerUser(textId: string) {
  const { data: rows, error } = await supabase
    .from('user_activity')
    .select('user_id, wpm, score')
    .eq('text_id', textId)
    .not('score', 'is', null)

  if (error) {
    throw new Error(
      `Failed to fetch user_activity for leaderboard: ${error.message}`
    )
  }
  if (!rows) return []

  const bestByUser = new Map<
    string,
    { wpm: number; quizScore: number; overallScore: number }
  >()

  for (const row of rows) {
    const overallScore = computeOverallScore(row.wpm, row.score)
    const existing = bestByUser.get(row.user_id)
    if (!existing || overallScore > existing.overallScore) {
      bestByUser.set(row.user_id, {
        wpm: row.wpm,
        quizScore: row.score,
        overallScore,
      })
    }
  }

  const userIds = Array.from(bestByUser.keys())

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds)

  if (userError) {
    console.error(
      'Failed to fetch usernames for leaderboard:',
      userError.message
    )
  }

  // Fetch avatar URLs per user (avoids listUsers which fetches ALL users)
  const avatarResults = await Promise.all(
    userIds.map((id) => supabase.auth.admin.getUserById(id))
  )

  const usernamesByUserId = new Map(
    (userData ?? []).map((u) => [u.id, u.username])
  )
  const avatarUrlsByUserId = new Map(
    avatarResults.map((r, i) => [userIds[i], extractAvatarUrl(r.data?.user)])
  )

  return Array.from(bestByUser.entries()).map(([userId, stats]) => ({
    userId,
    username: usernamesByUserId.get(userId) ?? null,
    avatarUrl: avatarUrlsByUserId.get(userId) ?? null,
    ...stats,
  }))
}

/**
 * Populate the full leaderboard for a text into Redis.
 * Called on cold cache (sorted set doesn't exist).
 */
async function backfillText(textId: string) {
  const entries = await computeBestPerUser(textId)
  if (entries.length === 0) return

  const lbKey = `lb:${textId}`
  const pipeline = redis.pipeline()

  for (const entry of entries) {
    pipeline.zadd(lbKey, {
      score: entry.overallScore,
      member: entry.userId,
    })
    pipeline.hset(`lb_stats:${textId}:${entry.userId}`, {
      username: entry.username ?? '',
      avatarUrl: entry.avatarUrl ?? '',
      wpm: entry.wpm,
      quizScore: entry.quizScore,
      overallScore: entry.overallScore,
    })
    pipeline.expire(`lb_stats:${textId}:${entry.userId}`, LB_TTL)
  }

  pipeline.expire(lbKey, LB_TTL)
  await pipeline.exec()
}

/**
 * Update a single user's leaderboard entry in Redis.
 * If the sorted set doesn't exist (cold cache), backfill first.
 */
async function updateUserEntry(textId: string, userId: string) {
  const lbKey = `lb:${textId}`

  const exists = await redis.exists(lbKey)
  if (!exists) {
    await backfillText(textId)
    return { status: 'backfilled' }
  }

  const { data: rows, error } = await supabase
    .from('user_activity')
    .select('wpm, score')
    .eq('text_id', textId)
    .eq('user_id', userId)
    .not('score', 'is', null)

  if (error || !rows || rows.length === 0) {
    return { status: 'no_scored_activity' }
  }

  let bestWpm = 0
  let bestQuizScore = 0
  let bestOverall = 0

  for (const row of rows) {
    const overall = computeOverallScore(row.wpm, row.score)
    if (overall > bestOverall) {
      bestWpm = row.wpm
      bestQuizScore = row.score
      bestOverall = overall
    }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .maybeSingle()

  if (userError) {
    console.error('Failed to fetch username for user:', userError.message)
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.getUserById(userId)

  if (authError) {
    console.error('Failed to fetch auth data for user:', authError.message)
  }
  const username = userData?.username ?? null
  const avatarUrl = extractAvatarUrl(authData?.user)

  const statsKey = `lb_stats:${textId}:${userId}`
  const pipeline = redis.pipeline()

  // bestOverall is already the user's highest-scoring attempt from all rows,
  // so we unconditionally set it (no GT flag needed).
  pipeline.zadd(lbKey, { score: bestOverall, member: userId })
  pipeline.hset(statsKey, {
    username: username ?? '',
    avatarUrl: avatarUrl ?? '',
    wpm: bestWpm,
    quizScore: bestQuizScore,
    overallScore: bestOverall,
  })
  pipeline.expire(lbKey, LB_TTL)
  pipeline.expire(statsKey, LB_TTL)
  await pipeline.exec()

  return { status: 'updated', overallScore: bestOverall }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: RequestBody | null = null
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const textId = body?.text_id?.trim()
  if (!textId) {
    return jsonResponse({ error: 'text_id is required' }, 400)
  }

  // UPDATE action: called after quiz save to update Redis cache
  if (body?.action === 'update') {
    const userId = body.user_id?.trim()
    if (!userId) {
      return jsonResponse({ error: 'user_id is required for update' }, 400)
    }

    try {
      const result = await updateUserEntry(textId, userId)
      return jsonResponse(result)
    } catch (err) {
      console.error('Leaderboard update failed:', err)
      return jsonResponse({ error: 'Failed to update leaderboard' }, 500)
    }
  }

  // Reject unrecognized actions (frontend reads directly from Upstash)
  return jsonResponse(
    { error: 'Use action: "update" to update leaderboard' },
    400
  )
})
