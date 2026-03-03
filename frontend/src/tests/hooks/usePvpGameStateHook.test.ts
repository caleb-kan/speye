import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const mockGetPvpGame = vi.fn()
const mockMarkReady = vi.fn()
const mockGetServerTime = vi.fn()
const mockGetTextForPvp = vi.fn()

vi.mock('../../services/pvpService', () => ({
  getPvpGame: (...args: unknown[]) => mockGetPvpGame(...args),
  markReady: (...args: unknown[]) => mockMarkReady(...args),
  getServerTime: (...args: unknown[]) => mockGetServerTime(...args),
  getTextForPvp: (...args: unknown[]) => mockGetTextForPvp(...args),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

import { usePvpGameState } from '../../hooks/usePvpGameState'
import { PVP_VS_SCREEN_MIN_DURATION_MS } from '../../constants/pvp'
import { makeGame as makeBaseGame } from '../helpers/pvpMockFactory'
import type { PvpGame, PvpTextData } from '../../types/database'

const GAME_ID = 'game-1'
const USER_ID = 'user-1'

function makeGame(overrides: Partial<PvpGame> = {}): PvpGame {
  return makeBaseGame({
    status: 'pending',
    player1_ready: false,
    player2_ready: false,
    ...overrides,
  })
}

const MOCK_TEXT: PvpTextData = {
  id: 'text-1',
  title: 'Test Text',
  content: 'word1 word2 word3 word4 word5',
  source: null,
  fiction: false,
  complexity: 5,
  quiz: {
    questionSets: [
      {
        questions: [
          {
            question: 'Q1?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
          },
        ],
      },
    ],
  },
}

/** Standard mock setup for a pending game that init processes fully. */
function setupPendingGame(game?: PvpGame) {
  const g = game ?? makeGame()
  mockGetServerTime.mockResolvedValue(new Date().toISOString())
  mockGetPvpGame.mockResolvedValue(g)
  mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)
  mockMarkReady.mockResolvedValue(g)
}

describe('usePvpGameState hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in loading phase', () => {
    setupPendingGame()
    const { result } = renderHook(() => usePvpGameState(GAME_ID))
    expect(result.current.phase).toBe('loading')
  })

  it('transitions to pregame for a pending game', async () => {
    setupPendingGame()

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('pregame')
    })

    expect(result.current.game).toBeTruthy()
    expect(result.current.text).toBeTruthy()
    expect(result.current.questionSet).toBeTruthy()
  })

  it('transitions to countdown for active game with future start', async () => {
    const futureStart = new Date(Date.now() + 5000).toISOString()
    const game = makeGame({
      status: 'active',
      reading_started_at: futureStart,
    })
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(game)
    mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('countdown')
    })
  })

  it('transitions to reading for active game with past start', async () => {
    const pastStart = new Date(Date.now() - 10000).toISOString()
    const game = makeGame({
      status: 'active',
      reading_started_at: pastStart,
    })
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(game)
    mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('reading')
    })
  })

  it('transitions to results for completed game', async () => {
    const game = makeGame({ status: 'completed' })
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(game)
    mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('results')
    })
  })

  it('transitions to results for abandoned game', async () => {
    const game = makeGame({ status: 'abandoned' })
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(game)
    mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('results')
    })
  })

  it('shows error when game not found', async () => {
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(null)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('error')
    })

    expect(result.current.error).toBe('Game not found')
  })

  it('shows error when user is not a participant', async () => {
    const game = makeGame({
      player1_id: 'other-1',
      player2_id: 'other-2',
    })
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(game)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('error')
    })

    expect(result.current.error).toBe('You are not a participant in this game')
  })

  it('shows error when text not found', async () => {
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(makeGame())
    mockGetTextForPvp.mockResolvedValue(null)
    mockMarkReady.mockResolvedValue(makeGame())

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('error')
    })

    expect(result.current.error).toBe('Failed to load text')
  })

  it('shows error when quiz data is missing', async () => {
    const textNoQuiz: PvpTextData = { ...MOCK_TEXT, quiz: null }
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(makeGame())
    mockGetTextForPvp.mockResolvedValue(textNoQuiz)
    mockMarkReady.mockResolvedValue(makeGame())

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('error')
    })

    expect(result.current.error).toBe(
      'Quiz data is missing or invalid for this text'
    )
  })

  it('shows error on init fetch failure', async () => {
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('error')
    })

    expect(result.current.error).toBe(
      'Failed to load game. (Network error) Please refresh the page.'
    )
  })

  it('calls markReady on pending game and transitions on active response', async () => {
    vi.useFakeTimers()
    const futureStart = new Date(Date.now() + 5000).toISOString()
    const activeGame = makeGame({
      status: 'active',
      player1_ready: true,
      player2_ready: true,
      reading_started_at: futureStart,
    })
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(makeGame())
    mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)
    mockMarkReady.mockResolvedValue(activeGame)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    // Flush async init (mocks resolve immediately)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(mockMarkReady).toHaveBeenCalledWith(GAME_ID, USER_ID)
    // Still on VS screen due to minimum display duration
    expect(result.current.phase).toBe('pregame')

    // Advance past VS screen minimum duration
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PVP_VS_SCREEN_MIN_DURATION_MS)
    })

    expect(result.current.phase).toBe('countdown')
  })

  it('transitions to results immediately when game completes during VS screen', async () => {
    vi.useFakeTimers()
    const futureStart = new Date(Date.now() + 5000).toISOString()
    const activeGame = makeGame({
      status: 'active',
      player1_ready: true,
      player2_ready: true,
      reading_started_at: futureStart,
    })
    setupPendingGame()
    mockMarkReady.mockResolvedValue(activeGame)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.phase).toBe('pregame')

    // Game abandoned while VS screen is showing
    const abandonedGame = makeGame({ status: 'abandoned' })
    act(() => {
      result.current.handleGameUpdate(abandonedGame)
    })

    // Should transition to results immediately, not wait for VS timer
    expect(result.current.phase).toBe('results')

    // VS timer fires later but phase should not regress
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PVP_VS_SCREEN_MIN_DURATION_MS)
    })

    expect(result.current.phase).toBe('results')
  })

  it('transitions to reading immediately when game advances past countdown during VS screen', async () => {
    vi.useFakeTimers()
    const futureStart = new Date(Date.now() + 5000).toISOString()
    const activeGame = makeGame({
      status: 'active',
      player1_ready: true,
      player2_ready: true,
      reading_started_at: futureStart,
    })
    setupPendingGame()
    mockMarkReady.mockResolvedValue(activeGame)

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.phase).toBe('pregame')

    // Realtime update: game already past countdown
    const pastStart = new Date(Date.now() - 10000).toISOString()
    const readingGame = makeGame({
      status: 'active',
      reading_started_at: pastStart,
    })
    act(() => {
      result.current.handleGameUpdate(readingGame)
    })

    // Should bypass VS timer and go directly to reading
    expect(result.current.phase).toBe('reading')
  })

  it('shows error when markReady fails', async () => {
    mockGetServerTime.mockResolvedValue(new Date().toISOString())
    mockGetPvpGame.mockResolvedValue(makeGame())
    mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)
    mockMarkReady.mockRejectedValue(new Error('RPC failed'))

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).toBe('error')
    })

    expect(result.current.error).toContain('Failed to signal readiness')
  })

  it('detects pending submission from sessionStorage', async () => {
    sessionStorage.setItem(
      'pvp-submit-game-1',
      JSON.stringify({ wpm: 300, score: 80 })
    )
    setupPendingGame()

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).not.toBe('loading')
    })

    expect(result.current.pendingSubmit).toEqual({ wpm: 300, score: 80 })
  })

  it('ignores invalid sessionStorage data', async () => {
    sessionStorage.setItem('pvp-submit-game-1', 'invalid-json')
    setupPendingGame()

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).not.toBe('loading')
    })

    expect(result.current.pendingSubmit).toBeNull()
  })

  it('does nothing when gameId is null', () => {
    // Clear any stale polling calls from previous tests' intervals
    mockGetPvpGame.mockClear()
    const { result } = renderHook(() => usePvpGameState(null))

    expect(result.current.phase).toBe('loading')
    expect(mockGetPvpGame).not.toHaveBeenCalled()
  })

  describe('manual phase transitions', () => {
    async function setupCountdownGame() {
      const futureStart = new Date(Date.now() + 5000).toISOString()
      const game = makeGame({
        status: 'active',
        reading_started_at: futureStart,
      })
      mockGetServerTime.mockResolvedValue(new Date().toISOString())
      mockGetPvpGame.mockResolvedValue(game)
      mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)

      const hook = renderHook(() => usePvpGameState(GAME_ID))

      await waitFor(() => {
        expect(hook.result.current.phase).toBe('countdown')
      })

      return hook
    }

    it('startReading transitions from countdown to reading', async () => {
      const { result } = await setupCountdownGame()

      act(() => result.current.startReading())

      expect(result.current.phase).toBe('reading')
    })

    it('startQuiz transitions from reading to quiz', async () => {
      const { result } = await setupCountdownGame()

      act(() => result.current.startReading())
      act(() => result.current.startQuiz())

      expect(result.current.phase).toBe('quiz')
    })

    it('finishQuiz transitions from quiz to waiting', async () => {
      const { result } = await setupCountdownGame()

      act(() => result.current.startReading())
      act(() => result.current.startQuiz())
      act(() => result.current.finishQuiz())

      expect(result.current.phase).toBe('waiting')
    })

    it('showResults transitions from waiting to results', async () => {
      const { result } = await setupCountdownGame()

      act(() => result.current.startReading())
      act(() => result.current.startQuiz())
      act(() => result.current.finishQuiz())
      act(() => result.current.showResults())

      expect(result.current.phase).toBe('results')
    })

    it('startQuiz does nothing when not in reading phase', async () => {
      const { result } = await setupCountdownGame()

      act(() => result.current.startQuiz())

      expect(result.current.phase).toBe('countdown')
    })

    it('finishQuiz does nothing when not in quiz phase', async () => {
      const { result } = await setupCountdownGame()

      act(() => result.current.startReading())
      act(() => result.current.finishQuiz())

      expect(result.current.phase).toBe('reading')
    })
  })

  describe('handleGameUpdate', () => {
    it('transitions phase based on game update', async () => {
      setupPendingGame()

      const { result } = renderHook(() => usePvpGameState(GAME_ID))

      await waitFor(() => {
        expect(result.current.phase).toBe('pregame')
      })

      const pastStart = new Date(Date.now() - 10000).toISOString()
      const activeGame = makeGame({
        status: 'active',
        reading_started_at: pastStart,
      })

      act(() => {
        result.current.handleGameUpdate(activeGame)
      })

      expect(result.current.phase).toBe('reading')
    })

    it('transitions to results when completed game update arrives in waiting', async () => {
      const pastStart = new Date(Date.now() - 10000).toISOString()
      const game = makeGame({
        status: 'active',
        reading_started_at: pastStart,
      })
      mockGetServerTime.mockResolvedValue(new Date().toISOString())
      mockGetPvpGame.mockResolvedValue(game)
      mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)

      const { result } = renderHook(() => usePvpGameState(GAME_ID))

      await waitFor(() => {
        expect(result.current.phase).toBe('reading')
      })

      act(() => result.current.startQuiz())
      act(() => result.current.finishQuiz())

      expect(result.current.phase).toBe('waiting')

      const completedGame = makeGame({ status: 'completed' })
      act(() => {
        result.current.handleGameUpdate(completedGame)
      })

      expect(result.current.phase).toBe('results')
    })
  })

  it('sets clockSyncWarning when server time fetch fails', async () => {
    mockGetServerTime.mockRejectedValue(new Error('timeout'))
    // Promise.allSettled lets getPvpGame succeed even when
    // fetchClockOffset rejects, so init completes with offset=0
    mockGetPvpGame.mockResolvedValue(makeGame())
    mockGetTextForPvp.mockResolvedValue(MOCK_TEXT)
    mockMarkReady.mockResolvedValue(makeGame())

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    // fetchClockOffset retries with real setTimeout delays (~2s total),
    // so wait long enough for the init to complete
    await waitFor(
      () => {
        expect(result.current.phase).not.toBe('loading')
      },
      { timeout: 10000 }
    )

    expect(result.current.clockSyncWarning).toBe(true)
  })

  it('pendingSubmit defaults to null', async () => {
    setupPendingGame()

    const { result } = renderHook(() => usePvpGameState(GAME_ID))

    await waitFor(() => {
      expect(result.current.phase).not.toBe('loading')
    })

    expect(result.current.pendingSubmit).toBeNull()
  })
})
