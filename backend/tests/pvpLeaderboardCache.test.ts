import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

const request = (token = 'user-token', method = 'POST') =>
  new Request('http://edge.invalid', {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

const rows = [
  {
    user_id: '00000000-0000-4000-8000-000000000001',
    elo_rating: 1200,
    games_played: 5,
    wins: 3,
    losses: 1,
    draws: 1,
    users: [{ username: 'Leader' }],
  },
  {
    user_id: '00000000-0000-4000-8000-000000000002',
    elo_rating: 1100,
    games_played: 2,
    wins: 1,
    losses: 1,
    draws: 0,
    users: { username: 'RunnerUp' },
  },
]
const top = rows.map(({ users, ...row }) => ({
  ...row,
  username: (Array.isArray(users) ? users[0] : users).username,
}))

afterEach(() => vi.restoreAllMocks())

function setup({
  authenticated = true,
  data = rows as Array<
    Omit<(typeof rows)[number], 'users'> & {
      users: { username: string } | { username: string }[] | null
    }
  >,
  databaseError = false,
  redisError = false,
  token = 'private-standard-token',
  cache = new Map<string, string>(),
} = {}) {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: authenticated ? { id: 'user-id' } : null },
    error: authenticated ? null : { message: 'Invalid token' },
  })
  const filters: unknown[][] = []
  const query = {
    select: vi.fn(() => query),
    gt: (...args: unknown[]) => {
      filters.push(['gt', ...args])
      return query
    },
    order: (...args: unknown[]) => {
      filters.push(['order', ...args])
      return query
    },
    limit: vi.fn().mockResolvedValue({
      data,
      error: databaseError ? { message: 'Database unavailable' } : null,
    }),
  }
  const from = vi.fn(() => query)
  const createClient = vi.fn(() => ({ auth: { getUser }, from }))
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (redisError) throw new Error('Redis unavailable')
    const [command, key, value] = JSON.parse(String(init?.body))
    if (command === 'SET') cache.set(key, value)
    return new Response(
      JSON.stringify({
        result: command === 'GET' ? (cache.get(key) ?? null) : 'OK',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  })
  const handler = loadEdgeFunction('pvp-leaderboard', {
    env: {
      SUPABASE_ANON_KEY: 'public-anon-key',
      UPSTASH_REDIS_REST_URL: 'https://redis.invalid',
      UPSTASH_REDIS_REST_TOKEN: token,
    },
    modules: { 'jsr:@supabase/supabase-js@2': { createClient } },
    fetch: fetch as typeof globalThis.fetch,
  })
  return { handler, cache, fetch, from, filters, query, getUser, createClient }
}

describe('authenticated PvP shared leaderboard cache', () => {
  it('fills an encrypted 30-second cache with only the public top-five projection', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const { handler, cache, fetch, filters, query, createClient } = setup()
    const response = await handler(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ top })
    expect(createClient).toHaveBeenCalledWith(
      'http://supabase.invalid',
      'public-anon-key',
      {
        global: { headers: { Authorization: 'Bearer user-token' } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    )
    expect(filters).toEqual([
      ['gt', 'games_played', 0],
      ['order', 'elo_rating', { ascending: false }],
      ['order', 'games_played', { ascending: false }],
      ['order', 'user_id', { ascending: true }],
    ])
    expect(query.limit).toHaveBeenCalledWith(5)
    expect(query.select).toHaveBeenCalledWith(
      'user_id, elo_rating, games_played, wins, losses, draws, users(username)'
    )
    const encrypted = cache.get('pvp:leaderboard:v1')!
    expect(encrypted).toMatch(/^v1\.[^.]+\.[^.]+$/)
    expect(encrypted).not.toContain('Leader')
    expect(encrypted).not.toContain(rows[0].user_id)
    expect(encrypted).not.toContain('1200')
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toEqual([
      'SET',
      'pvp:leaderboard:v1',
      encrypted,
      'EX',
      30,
    ])
    expect(fetch.mock.calls.every(([, init]) => init?.signal)).toBe(true)
    expect(timeout.mock.calls).toEqual([[3000], [3000]])
  })

  it('reads the authenticated warm cache without another rating query or extending its TTL', async () => {
    const { handler, fetch, from, getUser } = setup()
    await handler(request())
    fetch.mockClear()
    from.mockClear()
    getUser.mockClear()
    expect(await (await handler(request())).json()).toEqual({ top })
    expect(getUser).toHaveBeenCalledOnce()
    expect(from).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledOnce()
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual([
      'GET',
      'pvp:leaderboard:v1',
    ])
    expect(getUser.mock.invocationCallOrder[0]).toBeLessThan(
      fetch.mock.invocationCallOrder[0]
    )
  })

  it('caches an empty leaderboard', async () => {
    const { handler, from } = setup({ data: [] })
    expect(await (await handler(request())).json()).toEqual({ top: [] })
    from.mockClear()
    expect(await (await handler(request())).json()).toEqual({ top: [] })
    expect(from).not.toHaveBeenCalled()
  })

  it('normalizes a missing profile to a null username', async () => {
    const { handler } = setup({ data: [{ ...rows[0], users: null }] })
    expect(await (await handler(request())).json()).toEqual({
      top: [{ ...top[0], username: null }],
    })
  })

  it.each(['', 'bad-token'])(
    'rejects unauthorized token %j before reading Redis or ratings',
    async (token) => {
      const { handler, from, fetch } = setup({ authenticated: false })
      expect((await handler(request(token))).status).toBe(401)
      expect(from).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it('fails closed when authorization verification is unavailable', async () => {
    const { handler, from, fetch, getUser } = setup()
    getUser.mockRejectedValue(new Error('Auth unavailable'))
    expect((await handler(request())).status).toBe(500)
    expect(from).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps canonical reads available when Redis fails, without retrying requests', async () => {
    const { handler, fetch } = setup({ redisError: true })
    expect(await (await handler(request())).json()).toEqual({ top })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('replaces corrupt ciphertext with a canonical leaderboard', async () => {
    const cache = new Map([
      ['pvp:leaderboard:v1', 'v1.AAAAAAAAAAAAAAAA.invalid'],
    ])
    const { handler, from } = setup({ cache })
    expect(await (await handler(request())).json()).toEqual({ top })
    expect(from).toHaveBeenCalledOnce()
    expect(cache.get('pvp:leaderboard:v1')).not.toContain('invalid')
  })

  it('rejects tampered ciphertext and rebuilds after standard-token rotation', async () => {
    const first = setup()
    await first.handler(request())
    const initial = first.cache.get('pvp:leaderboard:v1')!
    const rotated = setup({ cache: first.cache, token: 'new-private-token' })
    expect(await (await rotated.handler(request())).json()).toEqual({ top })
    expect(rotated.from).toHaveBeenCalledOnce()
    const second = first.cache.get('pvp:leaderboard:v1')!
    expect(second).not.toBe(initial)
    const [version, iv, ciphertext] = second.split('.')
    const changed = (ciphertext[0] === 'A' ? 'B' : 'A') + ciphertext.slice(1)
    first.cache.set('pvp:leaderboard:v1', `${version}.${iv}.${changed}`)
    rotated.from.mockClear()
    expect(await (await rotated.handler(request())).json()).toEqual({ top })
    expect(rotated.from).toHaveBeenCalledOnce()
  })

  it('does not turn a database failure into an empty cache', async () => {
    const { handler, fetch, cache } = setup({ databaseError: true })
    expect((await handler(request())).status).toBe(500)
    expect(fetch).toHaveBeenCalledOnce()
    expect(cache.size).toBe(0)
  })

  it('supports anonymous CORS preflight but rejects unsupported methods', async () => {
    const { handler, from, fetch, getUser } = setup()
    expect((await handler(request('', 'OPTIONS'))).status).toBe(200)
    expect((await handler(request('', 'GET'))).status).toBe(405)
    expect(from).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(getUser).not.toHaveBeenCalled()
  })
})
