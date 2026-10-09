import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserByUsername } from '../supabase/database/users/getUserByUsername'

const { ilike, maybeSingle } = vi.hoisted(() => ({
  ilike: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ ilike }),
    }),
  },
}))
vi.mock('../supabase/database/logger', () => ({ logDbQuery: vi.fn() }))

beforeEach(() => {
  ilike.mockReset().mockReturnValue({ maybeSingle })
  maybeSingle.mockReset().mockResolvedValue({
    data: { id: 'matching-user' },
    error: null,
  })
})

describe('exact username lookup', () => {
  it.each([
    ['Reader_Name', 'Reader\\_Name'],
    ['Reader%Name', 'Reader\\%Name'],
    ['Reader\\Name', 'Reader\\\\Name'],
    ['Reader', 'Reader'],
  ])(
    'looks up %s literally while preserving case-insensitive matching',
    async (username, pattern) => {
      expect(await getUserByUsername(username)).toEqual({ id: 'matching-user' })
      expect(ilike).toHaveBeenCalledWith('username', pattern)
    }
  )

  it('propagates a lookup failure instead of reporting an available username', async () => {
    const error = { message: 'Lookup unavailable' }
    maybeSingle.mockResolvedValue({ data: null, error })
    await expect(getUserByUsername('Reader')).rejects.toEqual(error)
  })
})
