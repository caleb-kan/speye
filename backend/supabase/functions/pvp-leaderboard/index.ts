import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CACHE_KEY = 'pvp:leaderboard:v1'
const CACHE_TTL = 30
const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
const encoder = new TextEncoder()
const additionalData = encoder.encode(CACHE_KEY)
// The browser's text-cache token can read every key. Keep PvP data encrypted
// so its authenticated-only database visibility survives the shared cache.
const encryptionKey = crypto.subtle
  .digest('SHA-256', encoder.encode(`speye:pvp-cache:v1:${redisToken}`))
  .then((key) =>
    crypto.subtle.importKey('raw', key, 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ])
  )

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

type LeaderboardEntry = {
  user_id: string
  username: string | null
  elo_rating: number
  games_played: number
  wins: number
  losses: number
  draws: number
}

function isLeaderboardTop(value: unknown): value is LeaderboardEntry[] {
  return (
    Array.isArray(value) &&
    value.length <= 5 &&
    value.every(
      (row) =>
        row &&
        typeof row.user_id === 'string' &&
        (row.username === null || typeof row.username === 'string') &&
        ['elo_rating', 'games_played', 'wins', 'losses', 'draws'].every(
          (field) => Number.isSafeInteger(row[field]) && row[field] >= 0
        ) &&
        row.games_played > 0
    )
  )
}

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  if (!redisUrl || !redisToken) throw new Error('Redis is not configured')
  const response = await fetch(redisUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(3000),
  })
  const body = await response.json()
  if (!response.ok || body.error) throw new Error('Redis request failed')
  return body.result
}

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

async function encrypt(top: LeaderboardEntry[]): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData },
    await encryptionKey,
    encoder.encode(JSON.stringify(top))
  )
  return `v1.${base64(iv)}.${base64(new Uint8Array(encrypted))}`
}

async function decrypt(value: unknown): Promise<LeaderboardEntry[]> {
  if (typeof value !== 'string') throw new Error('Cache miss')
  const [version, encodedIv, encodedData, extra] = value.split('.')
  if (version !== 'v1' || !encodedIv || !encodedData || extra !== undefined) {
    throw new Error('Invalid cached leaderboard')
  }
  const iv = Uint8Array.from(atob(encodedIv), (char) => char.charCodeAt(0))
  if (iv.length !== 12) throw new Error('Invalid cache IV')
  const encrypted = Uint8Array.from(atob(encodedData), (char) =>
    char.charCodeAt(0)
  )
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData },
    await encryptionKey,
    encrypted
  )
  const top: unknown = JSON.parse(new TextDecoder().decode(plaintext))
  if (!isLeaderboardTop(top)) throw new Error('Invalid cached leaderboard')
  return top
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
  try {
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data.user) return jsonResponse({ error: 'Unauthorized' }, 401)
  } catch {
    return jsonResponse({ error: 'Failed to verify authorization' }, 500)
  }

  try {
    const top = await decrypt(await redisCommand(['GET', CACHE_KEY]))
    return jsonResponse({ top })
  } catch {
    // Missing, unavailable, or unreadable cache falls through to canonical RLS.
  }

  try {
    const { data, error } = await supabase
      .from('pvp_ratings')
      .select(
        'user_id, elo_rating, games_played, wins, losses, draws, users(username)'
      )
      .gt('games_played', 0)
      .order('elo_rating', { ascending: false })
      .order('games_played', { ascending: false })
      .order('user_id', { ascending: true })
      .limit(5)
    if (error) throw error

    const top = (data ?? []).map((row) => ({
      user_id: row.user_id,
      username:
        (Array.isArray(row.users) ? row.users[0] : row.users)?.username ?? null,
      elo_rating: row.elo_rating,
      games_played: row.games_played,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
    }))
    try {
      await redisCommand([
        'SET',
        CACHE_KEY,
        await encrypt(top),
        'EX',
        CACHE_TTL,
      ])
    } catch {
      console.warn('PvP leaderboard cache fill unavailable')
    }
    return jsonResponse({ top })
  } catch {
    return jsonResponse({ error: 'Failed to load PvP leaderboard' }, 500)
  }
})
