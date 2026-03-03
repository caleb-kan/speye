import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockGetPvpGame = vi.fn()

vi.mock('../../services/pvpService', () => ({
  getPvpGame: (...args: unknown[]) => mockGetPvpGame(...args),
}))

vi.mock('../../constants/pvp', async () => {
  const actual = await vi.importActual('../../constants/pvp')
  return actual
})

import { useEloAnimation } from '../../hooks/useEloAnimation'
import { makeGame as makeBaseGame } from '../helpers/pvpMockFactory'
import type { PvpGame } from '../../types/database'

function makeGame(overrides: Partial<PvpGame> = {}): PvpGame {
  return makeBaseGame({
    status: 'completed',
    winner_id: 'user-1',
    player1_wpm: 300,
    player1_quiz_score: 80,
    player1_overall_score: 100,
    player1_finished_at: '2025-01-01T12:01:00Z',
    player2_wpm: 250,
    player2_quiz_score: 60,
    player2_overall_score: 70,
    player2_finished_at: '2025-01-01T12:01:30Z',
    player1_progress: 100,
    player2_progress: 100,
    reading_started_at: '2025-01-01T12:00:05Z',
    finished_at: '2025-01-01T12:02:00Z',
    ...overrides,
  })
}

describe('useEloAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns eloReady true when Elo fields are populated', () => {
    const game = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 25,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.eloReady).toBe(true)
    expect(result.current.eloChange).toBe(25)
    expect(result.current.eloFetchFailed).toBe(false)
  })

  it('returns eloReady false and starts refetch when Elo is null', () => {
    const game = makeGame()

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.eloReady).toBe(false)
    expect(result.current.displayElo).toBeNull()
  })

  it('refetches game data when Elo is not yet populated', async () => {
    const game = makeGame()
    const updated = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 30,
    })
    mockGetPvpGame.mockResolvedValueOnce(updated)

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.eloReady).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
    })

    expect(mockGetPvpGame).toHaveBeenCalledWith('game-1')
    expect(result.current.eloReady).toBe(true)
    expect(result.current.eloChange).toBe(30)
  })

  it('sets eloFetchFailed after max refetch attempts with null returns', async () => {
    const game = makeGame()
    // Return null to trigger retry path (setRetryTrigger)
    mockGetPvpGame.mockResolvedValue(null)

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    // Each retry: 1000ms timeout + async resolution
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100)
      })
    }

    expect(result.current.eloFetchFailed).toBe(true)
    expect(result.current.eloReady).toBe(false)
  })

  it('sets eloFetchFailed after max attempts with fetch errors', async () => {
    const game = makeGame()
    mockGetPvpGame.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100)
      })
    }

    expect(result.current.eloFetchFailed).toBe(true)
  })

  it('identifies player2 correctly', () => {
    const game = makeGame({
      player2_elo_before: 1100,
      player2_elo_change: -15,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-2'))

    expect(result.current.eloReady).toBe(true)
    expect(result.current.eloChange).toBe(-15)
  })

  it('returns eloBefore correctly', () => {
    const game = makeGame({
      player1_elo_before: 1050,
      player1_elo_change: 25,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.eloBefore).toBe(1050)
  })

  it('returns eloBefore as null when elo is not ready', () => {
    const game = makeGame()

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.eloBefore).toBeNull()
  })

  it('starts displayElo at eloBefore when eloReady', () => {
    const game = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 25,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.displayElo).toBe(1000)
  })

  it('animates displayElo toward eloAfter', () => {
    const game = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 25,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    // After full animation duration (1500ms), displayElo should reach eloAfter
    act(() => {
      vi.advanceTimersByTime(1600)
    })

    expect(result.current.displayElo).toBe(1025)
  })

  it('does not animate when eloChange is 0', () => {
    const game = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 0,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.displayElo).toBe(1000)
  })

  it('detects rank promotion when elo increases across tier', () => {
    // Baby Snail (1090) -> Young Snail (1115)
    const game = makeGame({
      player1_elo_before: 1090,
      player1_elo_change: 25,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.rankPromoted).toBe(true)
    expect(result.current.rankDemoted).toBe(false)
    expect(result.current.newRankTier).toBe('Young Snail')
    expect(result.current.newRankColor).toBe('#CD7F32')
  })

  it('detects rank demotion when elo decreases across tier', () => {
    // Young Snail (1110) -> Baby Snail (1090)
    const game = makeGame({
      player1_elo_before: 1110,
      player1_elo_change: -20,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.rankDemoted).toBe(true)
    expect(result.current.rankPromoted).toBe(false)
    expect(result.current.newRankTier).toBe('Baby Snail')
    expect(result.current.newRankColor).toBe('#CD7F32')
  })

  it('does not show demotion when staying in same tier', () => {
    // Young Snail (1150) -> Young Snail (1130)
    const game = makeGame({
      player1_elo_before: 1150,
      player1_elo_change: -20,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.rankDemoted).toBe(false)
    expect(result.current.rankPromoted).toBe(false)
  })

  it('does not show rank change on draw with no tier change', () => {
    // Draw: elo stays same
    const game = makeGame({
      winner_id: null,
      player1_elo_before: 1000,
      player1_elo_change: 0,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.rankPromoted).toBe(false)
    expect(result.current.rankDemoted).toBe(false)
  })

  it('does not show rank promotion when staying in same tier', () => {
    const game = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 20,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.rankPromoted).toBe(false)
  })

  it('skips refetch when Elo is already populated', () => {
    const game = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 25,
    })

    renderHook(() => useEloAnimation(game, 'user-1'))

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockGetPvpGame).not.toHaveBeenCalled()
  })

  it('syncs with updated initialGame prop', () => {
    const game = makeGame()
    const { result, rerender } = renderHook(
      ({ g }) => useEloAnimation(g, 'user-1'),
      { initialProps: { g: game } }
    )

    expect(result.current.eloReady).toBe(false)

    // Parent passes updated game with Elo fields
    const updated = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 25,
    })
    rerender({ g: updated })

    expect(result.current.eloReady).toBe(true)
    expect(result.current.eloChange).toBe(25)
  })

  it('returns eloAfter as null when elo is not ready', () => {
    const game = makeGame()

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.eloReady).toBe(false)
    expect(result.current.eloAfter).toBeNull()
  })

  it('returns eloAfter as computed value when elo is ready', () => {
    const game = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 25,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.eloReady).toBe(true)
    expect(result.current.eloAfter).toBe(1025)
  })

  it('returns the game object', () => {
    const game = makeGame({
      player1_elo_before: 1000,
      player1_elo_change: 25,
    })

    const { result } = renderHook(() => useEloAnimation(game, 'user-1'))

    expect(result.current.game.id).toBe('game-1')
  })
})
