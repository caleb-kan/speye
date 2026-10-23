import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPvpLeaderboard } from '../supabase/database/pvp/pvpRatings'
import { updateLeaderboardCache } from '../supabase/database/leaderboard/updateLeaderboardCache'

const { providerFetch } = vi.hoisted(() => ({ providerFetch: vi.fn() }))
vi.mock('../../lib/supabase', async () => {
  const { createClient } = await import('@supabase/supabase-js')
  return {
    supabase: createClient('https://supabase.invalid', 'test-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: providerFetch },
    }),
  }
})
vi.mock('../supabase/database/logger', () => ({ logDbQuery: vi.fn() }))

const row = {
  user_id: 'reader',
  users: { username: 'Reader' },
  elo_rating: 1200,
  games_played: 2,
  wins: 1,
  losses: 1,
  draws: 0,
}

beforeEach(() => {
  vi.useFakeTimers()
  providerFetch.mockReset().mockImplementation((input, init) => {
    if (String(input).includes('/functions/v1/')) {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Stalled Edge request', 'AbortError')),
          { once: true }
        )
      })
    }
    return Promise.resolve(
      new Response(JSON.stringify([row]), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

const edgeStarted = () =>
  expect(
    providerFetch.mock.calls.some(([url]) =>
      String(url).includes('/functions/v1/')
    )
  ).toBe(true)

const directReads = () =>
  providerFetch.mock.calls.filter(([url]) =>
    String(url).includes('/rest/v1/pvp_ratings')
  )

describe('optional leaderboard Edge request deadlines', () => {
  it('reaches the real SDK database fallback after a stalled PvP request', async () => {
    const result = getPvpLeaderboard()
    await vi.waitFor(edgeStarted)
    expect(directReads()).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(8000)
    expect(directReads()).toHaveLength(1)
    const { users, ...stats } = row
    expect(await result).toEqual({
      top: [{ ...stats, username: users.username }],
      currentUser: null,
    })
  })

  it('settles a stalled cache update so callers can release sync and warm work', async () => {
    let state = 'pending'
    const result = updateLeaderboardCache('text', 'reader').then(
      () => {
        state = 'resolved'
      },
      () => {
        state = 'rejected'
      }
    )
    await vi.waitFor(edgeStarted)
    await vi.advanceTimersByTimeAsync(8000)
    expect(state).toBe('rejected')
    await result
  })
})
