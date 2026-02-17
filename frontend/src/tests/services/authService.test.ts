import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User, AuthError } from '@supabase/supabase-js'

vi.mock('../../../../lib/supabase')

import { updateUsername } from '../../services/authService'
import { supabase } from '../../../../lib/supabase'

const mockUpdateUser = vi.mocked(supabase.auth.updateUser)

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateUsername', () => {
    it('should update user metadata with new username', async () => {
      const mockUser: Partial<User> = {
        id: 'user-1',
        user_metadata: { username: 'newuser' },
      }
      mockUpdateUser.mockResolvedValue({
        data: {
          user: mockUser as User,
        },
        error: null,
      })

      const result = await updateUsername('newuser')

      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: { username: 'newuser' },
      })
      expect(result.data.user?.id).toBe('user-1')
    })

    it('should throw error if update fails', async () => {
      const mockError: Partial<AuthError> = {
        message: 'Auth error',
        name: 'AuthError',
      }
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: mockError as AuthError,
      })

      await expect(updateUsername('newuser')).rejects.toThrow()
    })
  })
})
