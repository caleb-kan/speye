import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockGetPvpLeaderboard = vi.fn()

vi.mock('../../services/pvpService', () => ({
  getPvpLeaderboard: (...args: unknown[]) => mockGetPvpLeaderboard(...args),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

import { usePvpLeaderboard } from '../../hooks/usePvpLeaderboard'

describe('usePvpLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in loading state', () => {
    mockGetPvpLeaderboard.mockResolvedValue({ top: [], currentUser: null })
    const { result } = renderHook(() => usePvpLeaderboard())

    expect(result.current.loading).toBe(true)
    expect(result.current.top).toEqual([])
    expect(result.current.currentUser).toBeNull()
  })

  it('fetches and returns leaderboard data', async () => {
    const mockTop = [
      { user_id: 'u1', elo_rating: 1500, username: 'Alice' },
      { user_id: 'u2', elo_rating: 1400, username: 'Bob' },
    ]
    const mockCurrentUser = {
      user_id: 'user-1',
      elo_rating: 1200,
      rank: 5,
      username: 'Me',
    }
    mockGetPvpLeaderboard.mockResolvedValueOnce({
      top: mockTop,
      currentUser: mockCurrentUser,
    })

    const { result } = renderHook(() => usePvpLeaderboard())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.top).toEqual(mockTop)
    expect(result.current.currentUser).toEqual(mockCurrentUser)
    expect(result.current.error).toBeNull()
    expect(mockGetPvpLeaderboard).toHaveBeenCalledWith('user-1')
  })

  it('sets error on fetch failure', async () => {
    mockGetPvpLeaderboard.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePvpLeaderboard())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load leaderboard')
  })

  it('refetch triggers a new fetch', async () => {
    mockGetPvpLeaderboard
      .mockResolvedValueOnce({ top: [], currentUser: null })
      .mockResolvedValueOnce({
        top: [{ user_id: 'u1', elo_rating: 1500 }],
        currentUser: null,
      })

    const { result } = renderHook(() => usePvpLeaderboard())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.top).toEqual([])

    result.current.refetch()

    await waitFor(() => {
      expect(result.current.top).toHaveLength(1)
    })
    expect(mockGetPvpLeaderboard).toHaveBeenCalledTimes(2)
  })
})
