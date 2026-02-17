import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminPromotion } from '../../hooks/useAdminPromotion'

const mockPromoteToAdmin = vi.fn()
const mockUsers = [
  { id: 'user-1', username: 'alice' },
  { id: 'user-2', username: 'bob' },
  { id: 'admin-user-3', username: 'admin' },
]

let mockUseUsersReturn = {
  users: mockUsers,
  loadingUsers: false,
  usersFetchError: null as string | null,
}

vi.mock('../../hooks/useUsers', () => ({
  useUsers: () => mockUseUsersReturn,
}))

vi.mock('../../services/userService', () => ({
  promoteToAdmin: (...args: unknown[]) => mockPromoteToAdmin(...args),
}))

describe('useAdminPromotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPromoteToAdmin.mockResolvedValue(undefined)
    mockUseUsersReturn = {
      users: mockUsers,
      loadingUsers: false,
      usersFetchError: null,
    }
  })

  it('should expose users from useUsers', async () => {
    const { result } = renderHook(() => useAdminPromotion())

    expect(result.current.loadingUsers).toBe(false)
  })

  it('should set error when fetch fails', async () => {
    mockUseUsersReturn = {
      users: [],
      loadingUsers: false,
      usersFetchError: 'Failed to load users',
    }

    const { result } = renderHook(() => useAdminPromotion())

    expect(result.current.error).toBe('Failed to load users')
  })

  it('should filter users by search query', async () => {
    const { result } = renderHook(() => useAdminPromotion())

    act(() => {
      result.current.setSearchQuery('admin')
    })

    expect(result.current.filteredUsers).toEqual([
      { id: 'admin-user-3', username: 'admin' },
    ])
  })

  it('should return all users when search query is empty', async () => {
    const { result } = renderHook(() => useAdminPromotion())

    expect(result.current.filteredUsers).toEqual(mockUsers)
  })

  it('should promote selected user successfully', async () => {
    const { result } = renderHook(() => useAdminPromotion())

    act(() => {
      result.current.setSelectedUserId('user-1')
    })

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.handlePromote()
    })

    expect(success).toBe(true)
    expect(mockPromoteToAdmin).toHaveBeenCalledWith('user-1')
    expect(result.current.successMessage).toBe(
      'User alice has been promoted to admin'
    )
    expect(result.current.selectedUserId).toBeNull()
    expect(result.current.searchQuery).toBe('')
  })

  it('should set error when no user is selected', async () => {
    const { result } = renderHook(() => useAdminPromotion())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.handlePromote()
    })

    expect(success).toBe(false)
    expect(mockPromoteToAdmin).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Please select a user to promote')
  })

  it('should set error when promotion fails', async () => {
    mockPromoteToAdmin.mockRejectedValue(
      new Error('Failed to promote user: Unauthorized')
    )

    const { result } = renderHook(() => useAdminPromotion())

    act(() => {
      result.current.setSelectedUserId('user-1')
    })

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.handlePromote()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Failed to promote user: Unauthorized')
  })

  it('should track promoting state', async () => {
    let resolvePromote: () => void
    mockPromoteToAdmin.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePromote = resolve
        })
    )

    const { result } = renderHook(() => useAdminPromotion())

    act(() => {
      result.current.setSelectedUserId('user-1')
    })

    act(() => {
      result.current.handlePromote()
    })

    await waitFor(() => {
      expect(result.current.promoting).toBe(true)
    })

    await act(async () => {
      resolvePromote!()
    })

    expect(result.current.promoting).toBe(false)
  })
})
