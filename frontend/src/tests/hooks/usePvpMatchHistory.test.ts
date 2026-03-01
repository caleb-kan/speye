import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockGetPvpMatchHistory = vi.fn()

vi.mock('../../services/pvpService', () => ({
  getPvpMatchHistory: (...args: unknown[]) => mockGetPvpMatchHistory(...args),
}))

let mockUser: { id: string } | null = { id: 'user-1' }
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

import { usePvpMatchHistory } from '../../hooks/usePvpMatchHistory'

describe('usePvpMatchHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'user-1' }
  })

  it('starts in loading state', () => {
    mockGetPvpMatchHistory.mockResolvedValue([])
    const { result } = renderHook(() => usePvpMatchHistory())

    expect(result.current.loading).toBe(true)
    expect(result.current.matches).toEqual([])
  })

  it('fetches and returns match history', async () => {
    const mockMatches = [
      { id: 'g1', opponent_username: 'Alice', status: 'completed' },
      { id: 'g2', opponent_username: 'Bob', status: 'abandoned' },
    ]
    mockGetPvpMatchHistory.mockResolvedValueOnce(mockMatches)

    const { result } = renderHook(() => usePvpMatchHistory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.matches).toEqual(mockMatches)
    expect(result.current.error).toBeNull()
    expect(mockGetPvpMatchHistory).toHaveBeenCalledWith('user-1')
  })

  it('sets error on fetch failure', async () => {
    mockGetPvpMatchHistory.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePvpMatchHistory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load match history')
  })

  it('skips fetch when user is null', async () => {
    mockUser = null

    const { result } = renderHook(() => usePvpMatchHistory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetPvpMatchHistory).not.toHaveBeenCalled()
    expect(result.current.matches).toEqual([])
  })

  it('refetch triggers a new fetch', async () => {
    mockGetPvpMatchHistory
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'g1' }])

    const { result } = renderHook(() => usePvpMatchHistory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.matches).toEqual([])

    result.current.refetch()

    await waitFor(() => {
      expect(result.current.matches).toHaveLength(1)
    })
    expect(mockGetPvpMatchHistory).toHaveBeenCalledTimes(2)
  })
})
