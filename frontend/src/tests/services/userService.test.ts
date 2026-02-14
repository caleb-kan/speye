import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { getUsers } from '../../services/userService'
import { supabase } from '../../../../lib/supabase'

const mockFrom = vi.mocked(supabase.from)

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUsers', () => {
    it('should fetch all user ids', async () => {
      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }]
      const mockSelect = vi.fn()

      mockSelect.mockResolvedValue({ data: mockUsers, error: null })
      mockFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<
        typeof supabase.from
      >)

      const result = await getUsers()

      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(mockSelect).toHaveBeenCalledWith('id')
      expect(result).toEqual(mockUsers)
    })

    it('should return empty array if no users exist', async () => {
      const mockSelect = vi.fn()

      mockSelect.mockResolvedValue({ data: null, error: null })
      mockFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<
        typeof supabase.from
      >)

      const result = await getUsers()

      expect(result).toEqual([])
    })

    it('should throw error if query fails', async () => {
      const mockSelect = vi.fn()

      mockSelect.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      mockFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<
        typeof supabase.from
      >)

      await expect(getUsers()).rejects.toThrow()
    })
  })
})
