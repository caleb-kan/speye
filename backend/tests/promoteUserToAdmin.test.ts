import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('../supabase/database/logger', () => ({
  logDbQuery: vi.fn(),
}))

import { promoteUserToAdmin } from '../supabase/database/users/promoteUserToAdmin'

describe('promoteUserToAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call set_user_role RPC with correct parameters', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await promoteUserToAdmin('user-123')

    expect(mockRpc).toHaveBeenCalledWith('set_user_role', {
      target_user_id: 'user-123',
      new_role: 'admin',
    })
  })

  it('should not throw on success', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await expect(promoteUserToAdmin('user-123')).resolves.toBeUndefined()
  })

  it('should throw with error message on RPC failure', async () => {
    mockRpc.mockResolvedValue({
      error: { message: 'Permission denied' },
    })

    await expect(promoteUserToAdmin('user-123')).rejects.toThrow(
      'Failed to promote user: Permission denied'
    )
  })
})
