import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Redis } from 'npm:@upstash/redis'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
  retry: { retries: 0 },
  signal: () => AbortSignal.timeout(3000),
})

const LB_TTL = 5 * 60 // Bound public profile and text-visibility staleness.

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
  if (wpm <= 0 || quizScore <= 0 || quizScore > MAX_QUIZ_SCORE) return 0
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
  text_id?: unknown
  user_id?: unknown
  action?: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAvatarUrl(user: any): string | null {
  const metadata = user?.user_metadata
  const identityData = user?.identities?.[0]?.identity_data
  const value =
    metadata?.avatar_url ??
    metadata?.picture ??
    identityData?.picture ??
    identityData?.avatar_url ??
    null
  return typeof value === 'string' ? value : null
}

type LeaderboardEntry = {
  userId: string
  username: string | null
  avatarUrl: string | null
  wpm: number
  quizScore: number
  overallScore: number
}

/** Match the database's earliest start_time, then id tie breaker. */
async function computeBestPerUser(textId: string, userId?: string) {
  const bestByUser = new Map<string, LeaderboardEntry>()
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from('user_activity')
      .select('id, user_id, start_time, wpm, score')
      .eq('text_id', textId)
      .not('score', 'is', null)
      .order('start_time', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (userId) query = query.eq('user_id', userId)
    const { data: rows, error } = await query
    if (error) throw error
    for (const row of rows ?? []) {
      if (
        !Number.isFinite(row.wpm) ||
        row.wpm < 0 ||
        !Number.isFinite(row.score) ||
        row.score < 0 ||
        row.score > MAX_QUIZ_SCORE
      ) {
        throw new Error('Invalid saved leaderboard statistics')
      }
      const overallScore = computeOverallScore(row.wpm, row.score)
      const existing = bestByUser.get(row.user_id)
      if (!existing || overallScore > existing.overallScore) {
        bestByUser.set(row.user_id, {
          userId: row.user_id,
          username: null,
          avatarUrl: null,
          wpm: row.wpm,
          quizScore: row.score,
          overallScore,
        })
      }
    }
    if (!rows || rows.length < pageSize) break
  }

  const entries = Array.from(bestByUser.values())
  // Bound Auth requests and profile queries independently of leaderboard size.
  for (let offset = 0; offset < entries.length; offset += 50) {
    const batch = entries.slice(offset, offset + 50)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username')
      .in(
        'id',
        batch.map((entry) => entry.userId)
      )
      .range(0, batch.length - 1)
    if (error) throw error
    const usernames = new Map(
      (users ?? []).map((user) => [user.id, user.username])
    )
    await Promise.all(
      batch.map(async (entry) => {
        const { data, error: authError } =
          await supabase.auth.admin.getUserById(entry.userId)
        if (authError) throw authError
        entry.username = usernames.get(entry.userId) ?? null
        entry.avatarUrl = extractAvatarUrl(data.user)
      })
    )
  }
  return entries
}

// Publish each generation atomically. Warm writes never extend its expiration.
// Preserve tied stats until the next canonical rebuild; only refresh matching results.
const WRITE_LEADERBOARD = `
local entries = cjson.decode(ARGV[1])
local ttl = redis.call('PTTL', KEYS[1])
local cold = ttl <= 0
if cold and ARGV[3] ~= '1' then return {'missing'} end
local function write(entry)
  local statsKey = ARGV[4] .. entry.userId
  redis.call('ZADD', KEYS[1], entry.overallScore, entry.userId)
  redis.call('HSET', statsKey,
    'username', entry.username == cjson.null and '' or entry.username,
    'avatarUrl', entry.avatarUrl == cjson.null and '' or entry.avatarUrl,
    'wpm', entry.wpm, 'quizScore', entry.quizScore,
    'overallScore', entry.overallScore)
  redis.call('PEXPIRE', statsKey, ttl)
end
if cold then
  redis.call('DEL', KEYS[1])
  ttl = tonumber(ARGV[5]) * 1000
  for _, entry in ipairs(entries) do write(entry) end
  redis.call('PEXPIRE', KEYS[1], ttl)
  return {'backfilled'}
end
for _, entry in ipairs(entries) do
  if entry.userId == ARGV[2] then
    local score = redis.call('ZSCORE', KEYS[1], entry.userId)
    local statsKey = ARGV[4] .. entry.userId
    local sameResult = tonumber(redis.call('HGET', statsKey, 'wpm')) == entry.wpm
      and tonumber(redis.call('HGET', statsKey, 'quizScore')) == entry.quizScore
    if not score or entry.overallScore > tonumber(score)
      or (entry.overallScore == tonumber(score)
        and sameResult) then
      write(entry)
      score = entry.overallScore
    end
    return {'updated', tostring(score)}
  end
end
return {'no_scored_activity'}
`

async function updateUserEntry(textId: string, userId: string) {
  const lbKey = `lb:${textId}`
  let cold = !(await redis.exists(lbKey))
  let entries = await computeBestPerUser(textId, cold ? undefined : userId)
  for (;;) {
    const result = await redis.eval<(string | number)[], [string, string?]>(
      WRITE_LEADERBOARD,
      [lbKey],
      [
        JSON.stringify(entries),
        userId,
        cold ? '1' : '0',
        `lb_stats:${textId}:`,
        LB_TTL,
      ]
    )
    if (result[0] !== 'missing') {
      return result[0] === 'updated'
        ? { status: 'updated', overallScore: Number(result[1]) }
        : { status: result[0] }
    }
    // The generation expired while its user's database query was in flight.
    cold = true
    entries = await computeBestPerUser(textId)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const accessToken = req.headers
    .get('Authorization')
    ?.match(/^Bearer (.+)$/i)?.[1]
  if (!accessToken) return jsonResponse({ error: 'Unauthorized' }, 401)

  let authenticatedUserId: string
  try {
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
    authenticatedUserId = data.user.id
  } catch {
    return jsonResponse({ error: 'Failed to verify authorization' }, 500)
  }

  let body: RequestBody | null = null
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const textId = typeof body?.text_id === 'string' ? body.text_id.trim() : ''
  if (!textId) {
    return jsonResponse({ error: 'text_id is required' }, 400)
  }

  // UPDATE action: called after quiz save to update Redis cache
  if (body?.action === 'update') {
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : ''
    if (!userId) {
      return jsonResponse({ error: 'user_id is required for update' }, 400)
    }
    if (userId !== authenticatedUserId) {
      return jsonResponse({ error: 'Cannot update another user' }, 403)
    }

    try {
      // Redis is readable by anonymous clients. Never copy activity from
      // private or unpublished texts through this service-role client.
      const { data: publicText, error: textError } = await supabase
        .from('texts')
        .select('id, admin_decision, llm_decision, quiz_valid')
        .eq('id', textId)
        .is('owner_id', null)
        .eq('processing_status', 'completed')
        .maybeSingle()
      if (textError) throw textError
      // Match get_random_text visibility, including legacy and automatically
      // approved texts that are already available to readers.
      const isVisible =
        publicText &&
        (publicText.admin_decision === 'approved' ||
          publicText.admin_decision === null ||
          (publicText.admin_decision === 'pending' &&
            publicText.llm_decision === 'approved' &&
            publicText.quiz_valid === true))
      if (!isVisible) return jsonResponse({ error: 'Text not found' }, 404)

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
