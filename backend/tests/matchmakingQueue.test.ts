import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  leaveQueue,
  leaveQueueOnUnload,
} from '../supabase/database/pvp/matchmakingQueue'

const { rpc, from, fetch, logDbQuery } = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  fetch: vi.fn(),
  logDbQuery: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ supabase: { rpc, from } }))
vi.mock('../supabase/database/logger', () => ({ logDbQuery }))

const userId = '00000000-0000-0000-0000-000000000001'
const supabaseUrl = 'https://project.supabase.co'

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: null, error: null })
  from.mockReset().mockReturnValue({
    delete: () => ({ eq: async () => ({ error: null }) }),
  })
  fetch.mockReset().mockResolvedValue({ ok: true })
  logDbQuery.mockReset()
  vi.stubGlobal('fetch', fetch)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('serialized matchmaking cancellation client', () => {
  it('uses the leave RPC instead of deleting outside the matchmaking mutex', async () => {
    await expect(leaveQueue(userId)).resolves.toBeNull()

    expect(rpc).toHaveBeenCalledWith('leave_matchmaking_queue', {
      p_user_id: userId,
    })
    expect(from).not.toHaveBeenCalled()
    expect(logDbQuery).toHaveBeenCalledWith({
      table: 'matchmaking_queue',
      action: 'RPC:leave_matchmaking_queue',
      errors: undefined,
    })
  })

  it('returns an active game reported atomically by the leave RPC', async () => {
    const gameId = '00000000-0000-0000-0000-000000000003'
    rpc.mockResolvedValue({ data: gameId, error: null })
    await expect(leaveQueue(userId)).resolves.toBe(gameId)
  })

  it('keeps delayed SPA cleanup authenticated as its original owner', async () => {
    const setHeader = vi.fn().mockResolvedValue({ data: null, error: null })
    rpc.mockReturnValue({ setHeader })

    await expect(leaveQueue(userId, 'original-token')).resolves.toBeNull()

    expect(rpc).toHaveBeenCalledWith('leave_matchmaking_queue', {
      p_user_id: userId,
    })
    expect(setHeader).toHaveBeenCalledWith(
      'Authorization',
      'Bearer original-token'
    )
  })

  it.each([undefined, '', { game_id: 'game' }])(
    'rejects a malformed leave RPC result instead of declaring the queue idle',
    async (data) => {
      rpc.mockResolvedValue({ data, error: null })
      await expect(leaveQueue(userId)).rejects.toThrow('invalid game ID')
    }
  )

  it.each([
    { code: '42501', message: 'Cannot leave another user’s queue' },
    { code: '57014', message: 'Lock wait canceled' },
  ])('propagates RPC failure $code without bypassing it', async (error) => {
    rpc.mockResolvedValue({ data: null, error })

    await expect(leaveQueue(userId)).rejects.toBe(error)

    expect(rpc).toHaveBeenCalledWith('leave_matchmaking_queue', {
      p_user_id: userId,
    })
    expect(from).not.toHaveBeenCalled()
    expect(logDbQuery).toHaveBeenCalledWith(
      expect.objectContaining({ errors: error.message })
    )
  })

  it('posts the same RPC with the original access token during unload', () => {
    leaveQueueOnUnload(userId, 'access-token', supabaseUrl, 'public-key')

    expect(fetch).toHaveBeenCalledWith(
      `${supabaseUrl}/rest/v1/rpc/leave_matchmaking_queue`,
      {
        method: 'POST',
        headers: {
          apikey: 'public-key',
          Authorization: 'Bearer access-token',
          Prefer: 'return=minimal',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId }),
        keepalive: true,
      }
    )
    expect(from).not.toHaveBeenCalled()
  })

  it.each([
    ['', 'access-token', supabaseUrl, 'public-key'],
    [userId, '', supabaseUrl, 'public-key'],
    [userId, 'access-token', '', 'public-key'],
    [userId, 'access-token', supabaseUrl, ''],
  ])(
    'skips unload cleanup when an authenticated request cannot be formed',
    (...args) => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      leaveQueueOnUnload(args[0], args[1], args[2], args[3])
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it('logs an unload authorization failure without falling back to a table deletion', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'Cannot leave another user’s queue',
    })

    leaveQueueOnUnload(userId, 'access-token', supabaseUrl, 'public-key')
    await vi.waitFor(() =>
      expect(log).toHaveBeenCalledWith(
        'leaveQueueOnUnload HTTP 403: Forbidden',
        'Cannot leave another user’s queue'
      )
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(from).not.toHaveBeenCalled()
  })
})
