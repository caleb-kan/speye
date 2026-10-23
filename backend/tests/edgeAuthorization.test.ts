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
    activityRows = undefined as
      | Array<{
          id?: string
          user_id?: string
          start_time?: string
          wpm: number
          score: number
        }>
      | undefined,
    activityError = false,
    profileError = false,
    authDataError = false,
    cacheExists = true,
    avatarUrl = 'https://example.invalid/avatar.png' as unknown,
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
              ? [{ id: 'user-1', username: 'Reader' }]
              : (
                  activityRows ??
                  (scoredActivity
                    ? [
                        { wpm: 400, score: 100 },
                        { wpm: 500, score: 25 },
                      ]
                    : [])
                ).map((row, index) => ({
                  id: `attempt-${String(index).padStart(6, '0')}`,
                  user_id: 'user-1',
                  start_time: '2026-10-23T12:00:00+00:00',
                  ...row,
                })),
        error:
          table === 'user_activity' && activityError
            ? { message: 'Activity unavailable' }
            : table === 'users' && profileError
              ? { message: 'Profiles unavailable' }
              : null,
      }
      let start = 0
      let end = 999
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
        order: (...args: unknown[]) => {
          filters.push(['order', ...args])
          return query
        },
        in: (...args: unknown[]) => {
          filters.push(['in', ...args])
          return query
        },
        range: (first: number, last: number) => {
          start = first
          end = last
          filters.push(['range', first, last])
          return query
        },
        maybeSingle: () => Promise.resolve(result),
        then: (resolve: (value: typeof result) => unknown) =>
          Promise.resolve({
            ...result,
            data: Array.isArray(result.data)
              ? result.data
                  .toSorted((left, right) => {
                    if (!filters.some((filter) => filter[0] === 'order'))
                      return 0
                    return (
                      String(left.start_time ?? '~').localeCompare(
                        String(right.start_time ?? '~')
                      ) || String(left.id).localeCompare(String(right.id))
                    )
                  })
                  .slice(start, end + 1)
              : result.data,
          }).then(resolve),
      }
      return query
    })
    const exists = vi.fn().mockResolvedValue(cacheExists ? 1 : 0)
    const pipeline = {
      zadd: vi.fn(),
      hset: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    }
    const evaluate = vi.fn(async (_script, _keys, args: string[]) => {
      const entries = JSON.parse(args[0])
      return args[2] === '1'
        ? ['backfilled']
        : entries.length
          ? ['updated', String(entries[0].overallScore)]
          : ['no_scored_activity']
    })
    const redisOptions = vi.fn()
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
                        avatar_url: avatarUrl,
                      },
                    },
                  },
                  error: authDataError
                    ? { message: 'Auth profile unavailable' }
                    : null,
                }),
              },
            },
          }),
        },
        'npm:@upstash/redis': {
          Redis: class {
            constructor(options: unknown) {
              redisOptions(options)
            }
            exists = exists
            eval = evaluate
            pipeline = () => pipeline
          },
        },
      },
    })
    return {
      handler,
      from,
      exists,
      getUser,
      queries,
      evaluate,
      redisOptions,
      entries: () =>
        evaluate.mock.calls.length
          ? JSON.parse(evaluate.mock.calls.at(-1)?.[2][0] ?? '[]')
          : pipeline.hset.mock.calls.map(([key, stats]) => ({
              userId: key.split(':').at(-1),
              ...stats,
            })),
    }
  }

  const update = { text_id: 'text-1', user_id: 'user-1', action: 'update' }

  it('bounds each Redis request without automatic retry amplification', () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    try {
      const { redisOptions } = setup()
      const options = redisOptions.mock.calls[0][0]
      expect(options.retry).toEqual({ retries: 0 })
      const first = options.signal()
      const second = options.signal()
      expect(first).toBeInstanceOf(AbortSignal)
      expect(second).not.toBe(first)
      expect(timeout.mock.calls).toEqual([[3000], [3000]])
    } finally {
      timeout.mockRestore()
    }
  })

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
    const { handler, entries, evaluate } = setup({ scoredActivity: true })
    const response = await handler(request(update))
    expect(response.status).toBe(200)
    expect(entries()).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        username: 'Reader',
        avatarUrl: 'https://example.invalid/avatar.png',
        wpm: 400,
        quizScore: 100,
        overallScore: 663,
      }),
    ])
    expect(evaluate).toHaveBeenCalledOnce()
  })

  it('preserves real attempt statistics when all overall scores are zero', async () => {
    const { handler, entries } = setup({
      activityRows: [{ wpm: 500, score: 25 }],
    })
    const response = await handler(request(update))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'updated',
      overallScore: 0,
    })
    expect(entries()).toEqual([
      expect.objectContaining({
        username: 'Reader',
        avatarUrl: 'https://example.invalid/avatar.png',
        wpm: 500,
        quizScore: 25,
        overallScore: 0,
      }),
    ])
  })

  it('reports a database failure instead of claiming there are no scored attempts', async () => {
    const { handler, evaluate } = setup({ activityError: true })
    const response = await handler(request(update))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'Failed to update leaderboard',
    })
    expect(evaluate).not.toHaveBeenCalled()
  })

  it('reads beyond PostgREST row limits before selecting the best attempt', async () => {
    const activityRows = Array.from({ length: 1500 }, () => ({
      wpm: 200,
      score: 0,
    }))
    activityRows.push({ wpm: 400.25, score: 100 })
    const { handler, queries, entries } = setup({ activityRows })
    expect((await handler(request(update))).status).toBe(200)
    expect(entries()[0]).toMatchObject({ wpm: 400.25, quizScore: 100 })
    expect(
      queries
        .filter((query) => query.table === 'user_activity')
        .map((query) => query.filters.find((filter) => filter[0] === 'range'))
    ).toEqual([
      ['range', 0, 499],
      ['range', 500, 999],
      ['range', 1000, 1499],
      ['range', 1500, 1999],
    ])
  })

  it('keeps the canonical earliest attempt when rounded scores tie', async () => {
    const { handler, queries, entries } = setup({
      activityRows: [
        {
          id: 'a',
          start_time: '2026-10-23T12:00:00.000002+00:00',
          wpm: 400.25,
          score: 100,
        },
        {
          id: 'b',
          start_time: '2026-10-23T12:00:00.000001+00:00',
          wpm: 400,
          score: 100,
        },
      ],
    })
    expect((await handler(request(update))).status).toBe(200)
    expect(entries()[0]).toMatchObject({
      wpm: 400,
      overallScore: 663,
    })
    expect(entries()[0]).not.toHaveProperty('attemptOrder')
    expect(entries()[0]).not.toHaveProperty('start_time')
    expect(entries()[0]).not.toHaveProperty('id')
    expect(queries[1].filters).toContainEqual([
      'order',
      'start_time',
      { ascending: true, nullsFirst: false },
    ])
    expect(queries[1].filters).toContainEqual([
      'order',
      'id',
      { ascending: true },
    ])
  })

  it('publishes the complete cold generation in one atomic call', async () => {
    const { handler, evaluate, entries } = setup({
      cacheExists: false,
      activityRows: [
        { user_id: 'user-1', wpm: 400, score: 100 },
        { user_id: 'user-2', wpm: 200, score: 100 },
      ],
    })
    const response = await handler(request(update))
    expect(await response.json()).toEqual({ status: 'backfilled' })
    expect(entries()).toHaveLength(2)
    expect(evaluate).toHaveBeenCalledOnce()
    expect(evaluate.mock.calls[0][1]).toEqual(['lb:text-1'])
    expect(evaluate.mock.calls[0][2].slice(1)).toEqual([
      'user-1',
      '1',
      'lb_stats:text-1:',
      300,
    ])
  })

  it('rebuilds a generation that expired during a warm database query', async () => {
    const { handler, evaluate, queries } = setup({ scoredActivity: true })
    evaluate.mockResolvedValueOnce(['missing'])
    const response = await handler(request(update))
    expect(await response.json()).toEqual({ status: 'backfilled' })
    expect(evaluate).toHaveBeenCalledTimes(2)
    expect(evaluate.mock.calls.map((call) => call[2][2])).toEqual(['0', '1'])
    expect(
      queries.filter((query) => query.table === 'user_activity')
    ).toHaveLength(2)
  })

  it('keeps malformed Auth metadata out of an atomic Redis write', async () => {
    const { handler, entries } = setup({
      scoredActivity: true,
      avatarUrl: { invalid: 'object' },
    })
    expect((await handler(request(update))).status).toBe(200)
    expect(entries()[0].avatarUrl).toBeNull()
  })

  it.each([
    { wpm: Infinity, score: 100 },
    { wpm: 200, score: 101 },
    { wpm: -1, score: 50 },
  ])(
    'rejects invalid saved numeric stats before any cache write (%j)',
    async (activity) => {
      const { handler, evaluate } = setup({ activityRows: [activity] })
      expect((await handler(request(update))).status).toBe(500)
      expect(evaluate).not.toHaveBeenCalled()
    }
  )

  it.each([{ profileError: true }, { authDataError: true }])(
    'does not publish incomplete profile data after an upstream error (%j)',
    async (failure) => {
      const { handler, evaluate } = setup({ scoredActivity: true, ...failure })
      expect((await handler(request(update))).status).toBe(500)
      expect(evaluate).not.toHaveBeenCalled()
    }
  )

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
