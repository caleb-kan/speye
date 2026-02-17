import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../backend/supabase/database/users/getUsersUsernames')
vi.mock('../../../../backend/supabase/database/users/getUserByUsername')

import {
  getUsersUsernames,
  isUsernameAvailable,
} from '../../services/userService'
import { getUsersUsernames as mockGetUsers } from '../../../../backend/supabase/database/users/getUsersUsernames'
import { getUserByUsername as mockGetUserByUsername } from '../../../../backend/supabase/database/users/getUserByUsername'

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUsersUsernames', () => {
    it('should return list of users from database', async () => {
      const mockUsers = [
        { id: 'user-1', username: 'alice' },
        { id: 'user-2', username: 'bob' },
        { id: 'user-3', username: 'carol' },
      ]
      vi.mocked(mockGetUsers).mockResolvedValue(mockUsers)

      const result = await getUsersUsernames()

      expect(result).toEqual(mockUsers)
    })

    it('should throw error if database query fails', async () => {
      vi.mocked(mockGetUsers).mockRejectedValue(new Error('DB error'))

      await expect(getUsersUsernames()).rejects.toThrow('DB error')
    })
  })

  describe('isUsernameAvailable', () => {
    it('should return true if username is available', async () => {
      vi.mocked(mockGetUserByUsername).mockResolvedValue(null)

      const result = await isUsernameAvailable('newuser')

      expect(result).toBe(true)
    })

    it('should return false if username already exists', async () => {
      vi.mocked(mockGetUserByUsername).mockResolvedValue({ id: 'user-1' })

      const result = await isUsernameAvailable('existinguser')

      expect(result).toBe(false)
    })

    it('should throw error if database query fails', async () => {
      vi.mocked(mockGetUserByUsername).mockRejectedValue(new Error('DB error'))

      await expect(isUsernameAvailable('someuser')).rejects.toThrow('DB error')
    })
  })
})
