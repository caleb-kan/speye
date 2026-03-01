import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockGetPvpRating = vi.fn()

vi.mock('../../services/pvpService', () => ({
  getPvpRating: (...args: unknown[]) => mockGetPvpRating(...args),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

import { usePvpRating } from '../../hooks/usePvpRating'

describe('usePvpRating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in loading state', () => {
    mockGetPvpRating.mockResolvedValue(null)
    const { result } = renderHook(() => usePvpRating())

    expect(result.current.loading).toBe(true)
    expect(result.current.rating).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('fetches and returns rating', async () => {
    const mockRating = { elo_rating: 1200, wins: 10, losses: 5 }
    mockGetPvpRating.mockResolvedValueOnce(mockRating)

    const { result } = renderHook(() => usePvpRating())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rating).toEqual(mockRating)
    expect(result.current.error).toBeNull()
    expect(mockGetPvpRating).toHaveBeenCalledWith('user-1')
  })

  it('handles null rating (new player)', async () => {
    mockGetPvpRating.mockResolvedValueOnce(null)

    const { result } = renderHook(() => usePvpRating())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rating).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    mockGetPvpRating.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePvpRating())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load rating')
    expect(result.current.rating).toBeNull()
  })

  it('refetch triggers a new fetch', async () => {
    mockGetPvpRating
      .mockResolvedValueOnce({ elo_rating: 1000 })
      .mockResolvedValueOnce({ elo_rating: 1100 })

    const { result } = renderHook(() => usePvpRating())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.rating).toEqual({ elo_rating: 1000 })

    result.current.refetch()

    await waitFor(() => {
      expect(result.current.rating).toEqual({ elo_rating: 1100 })
    })
    expect(mockGetPvpRating).toHaveBeenCalledTimes(2)
  })
})
