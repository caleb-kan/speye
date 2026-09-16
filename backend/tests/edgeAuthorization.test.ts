import { describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

const request = (body: unknown, token = 'test-user-token') =>
  new Request('http://edge.invalid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

describe('leaderboard authorization and request boundaries', () => {
  function setup({
    publicText = true,
    authenticated = true,
    scoredActivity = false,
    textVisibility = {
      admin_decision: 'approved' as string | null,
      llm_decision: 'approved',
      quiz_valid: true,
    },
  } = {}) {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: authenticated ? { id: 'user-1' } : null },
      error: authenticated ? null : { message: 'Invalid token' },
    })
    const queries: Array<{ table: string; filters: unknown[][] }> = []
    const from = vi.fn((table: string) => {
      const filters: unknown[][] = []
      queries.push({ table, filters })
      const result = {
        data:
          table === 'texts'
            ? publicText
              ? { id: 'text-1', ...textVisibility }
              : null
            : table === 'users'
              ? { username: 'Reader' }
              : scoredActivity
                ? [
                    { wpm: 400, score: 100 },
                    { wpm: 500, score: 25 },
                  ]
                : [],
        error: null,
      }
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          filters.push(['eq', ...args])
          return query
        },
        is: (...args: unknown[]) => {
          filters.push(['is', ...args])
          return query
        },
        not: () => query,
        maybeSingle: () => Promise.resolve(result),
        then: (resolve: (value: typeof result) => unknown) =>
          Promise.resolve(result).then(resolve),
      }
      return query
    })
    const exists = vi.fn().mockResolvedValue(1)
    const pipeline = {
      zadd: vi.fn(),
      hset: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    }
    const handler = loadEdgeFunction('leaderboard', {
      modules: {
        'jsr:@supabase/supabase-js@2': {
          createClient: () => ({
            from,
            auth: {
              getUser,
              admin: {
                getUserById: vi.fn().mockResolvedValue({
                  data: {
                    user: {
                      user_metadata: {
                        avatar_url: 'https://example.invalid/avatar.png',
                      },
                    },
                  },
                }),
              },
            },
          }),
        },
        'npm:@upstash/redis': {
          Redis: class {
            exists = exists
            pipeline = () => pipeline
          },
        },
      },
    })
    return { handler, from, exists, getUser, queries, pipeline }
  }

  const update = { text_id: 'text-1', user_id: 'user-1', action: 'update' }

  it('rejects requests without a user token before privileged reads', async () => {
    const { handler, from, exists } = setup()
    const response = await handler(request(update, ''))
    expect(response.status).toBe(401)
    expect(from).not.toHaveBeenCalled()
    expect(exists).not.toHaveBeenCalled()
  })

  it('verifies the user token with Supabase Auth', async () => {
    const { handler, getUser, from } = setup({ authenticated: false })
    const response = await handler(request(update))
    expect(response.status).toBe(401)
    expect(getUser).toHaveBeenCalledWith('test-user-token')
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects updates for another user', async () => {
    const { handler, from, exists } = setup()
    const response = await handler(request({ ...update, user_id: 'user-2' }))
    expect(response.status).toBe(403)
    expect(from).not.toHaveBeenCalled()
    expect(exists).not.toHaveBeenCalled()
  })

  it('does not publish private or unavailable texts into public Redis', async () => {
    const { handler, exists } = setup({ publicText: false })
    const response = await handler(request(update))
    expect(response.status).toBe(404)
    expect(exists).not.toHaveBeenCalled()
  })

  it('allows authenticated users to refresh their public-text result', async () => {
    const { handler, queries, exists } = setup()
    const response = await handler(request(update))
    expect(response.status).toBe(200)
    expect(queries[0]).toEqual({
      table: 'texts',
      filters: [
        ['eq', 'id', 'text-1'],
        ['is', 'owner_id', null],
        ['eq', 'processing_status', 'completed'],
      ],
    })
    expect(exists).toHaveBeenCalledWith('lb:text-1')
  })

  it.each([
    { admin_decision: null, llm_decision: 'approved', quiz_valid: false },
    { admin_decision: 'pending', llm_decision: 'approved', quiz_valid: true },
  ])(
    'keeps public reading texts eligible for leaderboard updates (%j)',
    async (textVisibility) => {
      const { handler, exists } = setup({ textVisibility })
      expect((await handler(request(update))).status).toBe(200)
      expect(exists).toHaveBeenCalledWith('lb:text-1')
    }
  )

  it.each([
    { admin_decision: 'rejected', llm_decision: 'approved', quiz_valid: true },
    { admin_decision: 'pending', llm_decision: 'approved', quiz_valid: false },
    { admin_decision: 'pending', llm_decision: 'rejected', quiz_valid: true },
  ])(
    'keeps unapproved texts out of public Redis (%j)',
    async (textVisibility) => {
      const { handler, exists } = setup({ textVisibility })
      expect((await handler(request(update))).status).toBe(404)
      expect(exists).not.toHaveBeenCalled()
    }
  )

  it('writes the best scored public attempt after verifying its owner', async () => {
    const { handler, pipeline } = setup({ scoredActivity: true })
    const response = await handler(request(update))
    expect(response.status).toBe(200)
    expect(pipeline.hset).toHaveBeenCalledWith('lb_stats:text-1:user-1', {
      username: 'Reader',
      avatarUrl: 'https://example.invalid/avatar.png',
      wpm: 400,
      quizScore: 100,
      overallScore: 663,
    })
    expect(pipeline.zadd).toHaveBeenCalledWith('lb:text-1', {
      score: 663,
      member: 'user-1',
    })
    expect(pipeline.exec).toHaveBeenCalledOnce()
  })

  it.each(
    [null, [], { ...update, text_id: 123 }, { ...update, user_id: {} }].map(
      (body) => ({ body })
    )
  )(
    'returns a client error for malformed JSON values (%j)',
    async ({ body }) => {
      const { handler, exists } = setup()
      const response = await handler(request(body))
      expect(response.status).toBe(400)
      expect(exists).not.toHaveBeenCalled()
    }
  )

  it('preserves anonymous CORS preflight', async () => {
    const { handler, getUser, from } = setup()
    const response = await handler(
      new Request('http://edge.invalid', { method: 'OPTIONS' })
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(getUser).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })
})
