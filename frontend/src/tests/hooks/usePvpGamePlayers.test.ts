import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockGetUsernamesByIds = vi.fn()
const mockGetPvpRating = vi.fn()

vi.mock('../../services/pvpService', () => ({
  getUsernamesByIds: (...args: unknown[]) => mockGetUsernamesByIds(...args),
  getPvpRating: (...args: unknown[]) => mockGetPvpRating(...args),
}))

import { usePvpGamePlayers } from '../../hooks/usePvpGamePlayers'
import { makeGame } from '../helpers/pvpMockFactory'

const USER_ID = 'user-1'
const OPP_ID = 'user-2'

describe('usePvpGamePlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default values initially', () => {
    const { result } = renderHook(() => usePvpGamePlayers(makeGame(), USER_ID))

    expect(result.current.myUsername).toBe('You')
    expect(result.current.opponentUsername).toBe('Opponent')
    expect(result.current.myElo).toBeNull()
    expect(result.current.opponentElo).toBeNull()
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches and populates player info', async () => {
    mockGetUsernamesByIds.mockResolvedValueOnce([
      { id: USER_ID, username: 'Alice' },
      { id: OPP_ID, username: 'Bob' },
    ])
    mockGetPvpRating
      .mockResolvedValueOnce({
        elo_rating: 1200,
        wins: 10,
        losses: 5,
      })
      .mockResolvedValueOnce({
        elo_rating: 1100,
        wins: 8,
        losses: 7,
      })

    const { result } = renderHook(() => usePvpGamePlayers(makeGame(), USER_ID))

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.myUsername).toBe('Alice')
    expect(result.current.opponentUsername).toBe('Bob')
    expect(result.current.myElo).toBe(1200)
    expect(result.current.opponentElo).toBe(1100)
    expect(result.current.myWins).toBe(10)
    expect(result.current.myLosses).toBe(5)
    expect(result.current.opponentWins).toBe(8)
    expect(result.current.opponentLosses).toBe(7)
    expect(result.current.error).toBeNull()
  })

  it('uses fallback usernames when null', async () => {
    mockGetUsernamesByIds.mockResolvedValueOnce([
      { id: USER_ID, username: null },
      { id: OPP_ID, username: null },
    ])
    mockGetPvpRating.mockResolvedValue(null)

    const { result } = renderHook(() => usePvpGamePlayers(makeGame(), USER_ID))

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.myUsername).toBe('You')
    expect(result.current.opponentUsername).toBe('Opponent')
  })

  it('uses default Elo when rating is null', async () => {
    mockGetUsernamesByIds.mockResolvedValueOnce([
      { id: USER_ID, username: 'Alice' },
      { id: OPP_ID, username: 'Bob' },
    ])
    mockGetPvpRating.mockResolvedValue(null)

    const { result } = renderHook(() => usePvpGamePlayers(makeGame(), USER_ID))

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.myElo).toBe(1000)
    expect(result.current.opponentElo).toBe(1000)
    expect(result.current.myWins).toBeNull()
    expect(result.current.myLosses).toBeNull()
  })

  it('sets error and loaded on fetch failure', async () => {
    mockGetUsernamesByIds.mockRejectedValueOnce(new Error('Network error'))
    mockGetPvpRating.mockResolvedValue(null)

    const { result } = renderHook(() => usePvpGamePlayers(makeGame(), USER_ID))

    await waitFor(() => {
      expect(result.current.error).toBe('Could not load usernames')
    })

    expect(result.current.loaded).toBe(true)
  })

  it('returns null Elo when rating fetch is rejected', async () => {
    mockGetUsernamesByIds.mockResolvedValueOnce([
      { id: USER_ID, username: 'Alice' },
      { id: OPP_ID, username: 'Bob' },
    ])
    mockGetPvpRating.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePvpGamePlayers(makeGame(), USER_ID))

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.myElo).toBeNull()
    expect(result.current.opponentElo).toBeNull()
    expect(result.current.error).toBe(
      'Could not load your rating, opponent rating'
    )
  })

  it('returns null Elo only for the rejected rating', async () => {
    mockGetUsernamesByIds.mockResolvedValueOnce([
      { id: USER_ID, username: 'Alice' },
      { id: OPP_ID, username: 'Bob' },
    ])
    mockGetPvpRating
      .mockResolvedValueOnce({ elo_rating: 1200, wins: 10, losses: 5 })
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePvpGamePlayers(makeGame(), USER_ID))

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.myElo).toBe(1200)
    expect(result.current.opponentElo).toBeNull()
    expect(result.current.error).toBe('Could not load opponent rating')
  })

  it('does not fetch when game is null', () => {
    renderHook(() => usePvpGamePlayers(null, USER_ID))

    expect(mockGetUsernamesByIds).not.toHaveBeenCalled()
    expect(mockGetPvpRating).not.toHaveBeenCalled()
  })

  it('does not fetch when userId is null', () => {
    renderHook(() => usePvpGamePlayers(makeGame(), null))

    expect(mockGetUsernamesByIds).not.toHaveBeenCalled()
    expect(mockGetPvpRating).not.toHaveBeenCalled()
  })

  it('identifies opponent as player1 when user is player2', async () => {
    mockGetUsernamesByIds.mockResolvedValueOnce([
      { id: USER_ID, username: 'Alice' },
      { id: OPP_ID, username: 'Bob' },
    ])
    mockGetPvpRating
      .mockResolvedValueOnce({ elo_rating: 1200, wins: 10, losses: 5 })
      .mockResolvedValueOnce({ elo_rating: 1100, wins: 8, losses: 7 })

    const { result } = renderHook(() => usePvpGamePlayers(makeGame(), OPP_ID))

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // When isPlayer1=false, oppId = player1_id = USER_ID
    expect(mockGetPvpRating).toHaveBeenCalledWith(OPP_ID)
    expect(mockGetPvpRating).toHaveBeenCalledWith(USER_ID)
  })
})
