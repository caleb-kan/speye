import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTextLeaderboard } from '../supabase/database/leaderboard/getTextLeaderboard'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }))
vi.mock('../supabase/database/logger', () => ({ logDbQuery: vi.fn() }))

beforeEach(() => {
  rpc.mockReset()
})

describe('database leaderboard client', () => {
  it('passes the text and signed-in user to the read RPC', async () => {
    const data = { top: [], currentUser: { userId: 'user-1', rank: 6 } }
    rpc.mockResolvedValue({ data, error: null })
    expect(await getTextLeaderboard('text-1', 'user-1')).toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_text_leaderboard', {
      p_text_id: 'text-1',
      p_current_user_id: 'user-1',
    })
  })

  it('supports a guest without supplying a user identity', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect(await getTextLeaderboard('text-1')).toEqual({
      top: [],
      currentUser: null,
    })
    expect(rpc).toHaveBeenCalledWith('get_text_leaderboard', {
      p_text_id: 'text-1',
      p_current_user_id: null,
    })
  })

  it('propagates database errors for the caller retry UI', async () => {
    const error = { message: 'Unavailable' }
    rpc.mockResolvedValue({ data: null, error })
    await expect(getTextLeaderboard('text-1')).rejects.toEqual(error)
  })

  it('does not issue a query without a text ID', async () => {
    await expect(getTextLeaderboard('')).rejects.toThrow('Text ID is required')
    expect(rpc).not.toHaveBeenCalled()
  })
})
