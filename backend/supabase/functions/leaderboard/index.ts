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

/**
 * For a given text, compute each user's best entry (highest wpm * score)
 * from user_activity. Returns one entry per user.
 */
async function computeBestPerUser(textId: string) {
  const { data: rows, error } = await supabase
    .from('user_activity')
    .select('user_id, wpm, score')
    .eq('text_id', textId)
    .not('score', 'is', null)

  if (error || !rows) return []

  const bestByUser = new Map<
    string,
    { wpm: number; quizScore: number; overallScore: number }
  >()

  for (const row of rows) {
    const overallScore = row.wpm * row.score
    const existing = bestByUser.get(row.user_id)
    if (!existing || overallScore > existing.overallScore) {
      bestByUser.set(row.user_id, {
        wpm: row.wpm,
        quizScore: row.score,
        overallScore,
      })
    }
  }

  return Array.from(bestByUser.entries()).map(([userId, stats]) => ({
    userId,
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

  // Check if sorted set exists; if not, backfill everything
  const exists = await redis.exists(lbKey)
  if (!exists) {
    await backfillText(textId)
    return { status: 'backfilled' }
  }

  // Compute this user's best score from Supabase
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
    const overall = row.wpm * row.score
    if (overall > bestOverall) {
      bestWpm = row.wpm
      bestQuizScore = row.score
      bestOverall = overall
    }
  }

  const statsKey = `lb_stats:${textId}:${userId}`
  const pipeline = redis.pipeline()

  // Only update if new score > existing score
  pipeline.zadd(lbKey, { score: bestOverall, member: userId }, { gt: true })
  pipeline.hset(statsKey, {
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
