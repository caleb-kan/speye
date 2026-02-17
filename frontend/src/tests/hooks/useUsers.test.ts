import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUsers } from '../../hooks/useUsers'

const mockGetUsers = vi.fn()

vi.mock('../../services/userService', () => ({
  getUsersUsernames: (...args: unknown[]) => mockGetUsers(...args),
}))

const mockUsers = [
  { id: 'user-1', username: 'alice' },
  { id: 'user-2', username: 'bob' },
  { id: 'user-3', username: 'carol' },
]

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsers.mockResolvedValue(mockUsers)
  })

  it('should fetch users on mount', async () => {
    const { result } = renderHook(() => useUsers())

    expect(result.current.loadingUsers).toBe(true)

    await waitFor(() => {
      expect(result.current.loadingUsers).toBe(false)
    })

    expect(mockGetUsers).toHaveBeenCalledOnce()
    expect(result.current.users).toEqual(mockUsers)
    expect(result.current.usersFetchError).toBeNull()
  })

  it('should set error when fetch fails', async () => {
    mockGetUsers.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loadingUsers).toBe(false)
    })

    expect(result.current.usersFetchError).toBe('Failed to load users')
    expect(result.current.users).toEqual([])
  })
})
