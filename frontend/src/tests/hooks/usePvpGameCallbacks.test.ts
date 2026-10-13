import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { StrictMode } from 'react'

// Mock all external dependencies before importing the hook
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockPreferences = { wpm: 400, mode: 'standard' as string }
vi.mock('../../hooks/useReadingPreferences', () => ({
  useReadingPreferences: () => ({
    preferences: mockPreferences,
  }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    session: { access_token: 'test-token' },
  }),
}))

const mockSendProgress = vi.fn()
const mockSendMilestone = vi.fn()
const mockSendHeartbeat = vi.fn()
vi.mock('../../hooks/usePvpGameChannel', () => ({
  usePvpGameChannel: () => ({
    sendProgress: mockSendProgress,
    sendMilestone: mockSendMilestone,
    sendHeartbeat: mockSendHeartbeat,
    connectionLost: false,
  }),
}))

vi.mock('../../hooks/usePvpHeartbeat', () => ({
  usePvpHeartbeat: () => ({
    opponentDisconnected: false,
    recordHeartbeat: vi.fn(),
  }),
}))

vi.mock('../../hooks/usePvpProgress', () => ({
  usePvpProgress: () => ({
    updateProgress: vi.fn(),
  }),
}))

vi.mock('../../hooks/usePvpAfkDetection', () => ({
  usePvpAfkDetection: () => ({
    afkWarning: false,
    recordActivity: vi.fn(),
  }),
}))

const mockSubmitPvpResult = vi.fn()
const mockForfeitPvpGame = vi.fn()
const mockForfeitOnUnload = vi.fn()
vi.mock('../../services/pvpService', () => ({
  submitPvpResult: (...args: unknown[]) => mockSubmitPvpResult(...args),
  forfeitPvpGame: (...args: unknown[]) => mockForfeitPvpGame(...args),
  forfeitOnUnload: (...args: unknown[]) => mockForfeitOnUnload(...args),
}))

vi.mock('../../services/logUserActivity', () => ({
  logUserActivity: vi.fn().mockResolvedValue(undefined),
}))

const mockSaveQuizResult = vi.fn().mockResolvedValue(undefined)
vi.mock('../../services/saveQuizResult', () => ({
  saveQuizResult: (...args: unknown[]) => mockSaveQuizResult(...args),
}))

vi.mock('../../../../lib/scoring', () => ({
  computeOverallScore: (wpm: number, score: number) => wpm + score,
}))

import { usePvpGameCallbacks } from '../../hooks/usePvpGameCallbacks'
import { logUserActivity } from '../../services/logUserActivity'
import type { PvpGame, PvpTextData } from '../../types/database'

const GAME_ID = 'game-123'
const USER_ID = 'user-456'

const MOCK_TEXT: PvpTextData = {
  id: 'text-789',
  title: 'Test Text',
  content: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10',
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

const COMPLETED_GAME = {
  id: GAME_ID,
  status: 'completed',
  player1_id: USER_ID,
  player2_id: 'opp-id',
} as PvpGame

function makeDefaultOptions(overrides = {}) {
  return {
    gameId: GAME_ID,
    userId: USER_ID,
    phase: 'reading' as const,
    text: MOCK_TEXT,
    pendingSubmit: null as { wpm: number; score: number } | null,
    handleGameUpdate: vi.fn(),
    startQuiz: vi.fn(),
    finishQuiz: vi.fn(),
    showResults: vi.fn(),
    setGame: vi.fn(),
    ...overrides,
  }
}

describe('usePvpGameCallbacks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    sessionStorage.clear()
    mockPreferences.wpm = 400
    mockPreferences.mode = 'standard'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('reading recovery', () => {
    it('restores the same reading position and elapsed time after a remount', () => {
      const opts = makeDefaultOptions()
      const first = renderHook(() => usePvpGameCallbacks(opts))
      act(() => first.result.current.handlePositionChange(3))
      act(() => vi.advanceTimersByTime(2000))
      first.unmount()
      act(() => vi.advanceTimersByTime(4000))
      const resumed = renderHook(() => usePvpGameCallbacks(opts))
      expect(resumed.result.current.initialWordIndex).toBe(3)
      expect(resumed.result.current.myProgress).toBe(30)
      expect(resumed.result.current.elapsedSeconds).toBe(6)
      act(() => resumed.result.current.handleReadingComplete(true))
      expect(logUserActivity).toHaveBeenCalledWith(
        expect.objectContaining({ wpm: 100 }),
        USER_ID
      )
      expect(mockForfeitPvpGame).not.toHaveBeenCalled()
    })

    it('returns completed reading to the quiz without another activity or changing WPM', async () => {
      const opts = makeDefaultOptions()
      const first = renderHook(() => usePvpGameCallbacks(opts))
      act(() => first.result.current.handlePositionChange(1))
      act(() => vi.advanceTimersByTime(6000))
      act(() => first.result.current.handleReadingComplete(true))
      first.unmount()
      act(() => vi.advanceTimersByTime(10000))
      const resumed = renderHook(() => usePvpGameCallbacks(opts))
      expect(resumed.result.current.myProgress).toBe(100)
      expect(opts.startQuiz).toHaveBeenCalledTimes(2)
      expect(logUserActivity).toHaveBeenCalledTimes(1)
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      await act(async () => resumed.result.current.handleQuizFinish(80))
      expect(resumed.result.current.myWpm).toBe(100)
      expect(resumed.result.current.myOverallScore).toBe(180)
    })

    it('keeps recovered position and WPM during StrictMode effect replay', async () => {
      const opts = makeDefaultOptions()
      const first = renderHook(() => usePvpGameCallbacks(opts))
      act(() => first.result.current.handlePositionChange(4))
      act(() => vi.advanceTimersByTime(6000))
      first.unmount()
      const resumed = renderHook(() => usePvpGameCallbacks(opts), {
        wrapper: StrictMode,
      })
      expect(resumed.result.current.initialWordIndex).toBe(4)
      act(() => resumed.result.current.handleReadingComplete(true))
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      await act(async () => resumed.result.current.handleQuizFinish(80))
      expect(resumed.result.current.myWpm).toBe(100)
    })

    it('isolates saved readings by both game and user', () => {
      const opts = makeDefaultOptions()
      const first = renderHook(() => usePvpGameCallbacks(opts))
      act(() => first.result.current.handlePositionChange(4))
      first.unmount()
      const otherGame = renderHook(() =>
        usePvpGameCallbacks({ ...opts, gameId: 'game-other' })
      )
      expect(otherGame.result.current.initialWordIndex).toBe(0)
      otherGame.unmount()
      const otherUser = renderHook(() =>
        usePvpGameCallbacks({ ...opts, userId: 'user-other' })
      )
      expect(otherUser.result.current.initialWordIndex).toBe(0)
      otherUser.unmount()
      const owner = renderHook(() => usePvpGameCallbacks(opts))
      expect(owner.result.current.initialWordIndex).toBe(4)
    })

    it('persists restart position while keeping the original reading timing', () => {
      const opts = makeDefaultOptions()
      const first = renderHook(() => usePvpGameCallbacks(opts))
      act(() => first.result.current.handlePositionChange(4))
      act(() => vi.advanceTimersByTime(3000))
      act(() => first.result.current.handlePositionChange(0))
      first.unmount()
      const resumed = renderHook(() => usePvpGameCallbacks(opts))
      expect(resumed.result.current.initialWordIndex).toBe(0)
      act(() => vi.advanceTimersByTime(3000))
      act(() => resumed.result.current.handlePositionChange(1))
      act(() => resumed.result.current.handleReadingComplete(true))
      expect(logUserActivity).toHaveBeenCalledWith(
        expect.objectContaining({ wpm: 100 }),
        USER_ID
      )
    })

    it('keeps the pending-submit guard when text loads after recovery starts', async () => {
      let resolveSubmit!: (game: PvpGame) => void
      mockSubmitPvpResult.mockImplementationOnce(
        () =>
          new Promise<PvpGame>((resolve) => {
            resolveSubmit = resolve
          })
      )
      const opts = makeDefaultOptions({
        phase: 'waiting',
        text: null,
        pendingSubmit: { wpm: 100, score: 80 },
      })
      const resumed = renderHook((options) => usePvpGameCallbacks(options), {
        initialProps: opts,
      })
      resumed.rerender({ ...opts, text: MOCK_TEXT })
      await act(async () => resumed.result.current.handleQuizFinish(70))
      expect(resumed.result.current.myQuizScore).toBe(80)
      expect(mockSubmitPvpResult).toHaveBeenCalledTimes(1)
      await act(async () => resolveSubmit(COMPLETED_GAME))
      expect(resumed.result.current.submitError).toBeNull()
    })

    it('clears reading recovery for results and document unload', () => {
      const opts = makeDefaultOptions()
      const first = renderHook(() => usePvpGameCallbacks(opts))
      act(() => first.result.current.handlePositionChange(4))
      window.dispatchEvent(new Event('beforeunload'))
      first.unmount()
      const afterUnload = renderHook(() => usePvpGameCallbacks(opts))
      expect(afterUnload.result.current.initialWordIndex).toBe(0)
      act(() => afterUnload.result.current.handlePositionChange(4))
      afterUnload.unmount()
      const results = renderHook(() =>
        usePvpGameCallbacks({ ...opts, phase: 'results' })
      )
      results.unmount()
      const afterResults = renderHook(() => usePvpGameCallbacks(opts))
      expect(afterResults.result.current.initialWordIndex).toBe(0)
    })

    it('restores the correct saved state across live game and user changes', () => {
      const opts = makeDefaultOptions()
      const hook = renderHook((options) => usePvpGameCallbacks(options), {
        initialProps: opts,
      })
      act(() => hook.result.current.handlePositionChange(4))
      hook.rerender({ ...opts, gameId: 'game-other' })
      expect(hook.result.current.initialWordIndex).toBe(0)
      expect(hook.result.current.myProgress).toBe(0)
      act(() => hook.result.current.handlePositionChange(2))
      hook.rerender({ ...opts, userId: 'user-other' })
      expect(hook.result.current.initialWordIndex).toBe(0)
      expect(hook.result.current.myProgress).toBe(0)
      hook.rerender(opts)
      expect(hook.result.current.initialWordIndex).toBe(4)
      expect(hook.result.current.myProgress).toBe(40)
    })

    it('removes recovered reading after a confirmed forfeit', async () => {
      const opts = makeDefaultOptions()
      const first = renderHook(() => usePvpGameCallbacks(opts))
      act(() => first.result.current.handlePositionChange(4))
      mockForfeitPvpGame.mockResolvedValueOnce(undefined)
      await act(async () => first.result.current.handleForfeit())
      first.unmount()
      const reopened = renderHook(() => usePvpGameCallbacks(opts))
      expect(reopened.result.current.initialWordIndex).toBe(0)
    })

    it('removes recovered reading after confirmed result submission', async () => {
      const opts = makeDefaultOptions()
      const first = renderHook(() => usePvpGameCallbacks(opts))
      act(() => first.result.current.handlePositionChange(4))
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      await act(async () => first.result.current.handleQuizFinish(80))
      first.unmount()
      const reopened = renderHook(() => usePvpGameCallbacks(opts))
      expect(reopened.result.current.initialWordIndex).toBe(0)
    })
  })

  describe('submitResult retry', () => {
    it('succeeds on first attempt', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledOnce()
      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        400,
        80
      )
      expect(opts.setGame).toHaveBeenCalledWith(COMPLETED_GAME)
      expect(opts.showResults).toHaveBeenCalled()
      expect(result.current.submitError).toBeNull()
    })

    it('retries and succeeds on second attempt', async () => {
      mockSubmitPvpResult
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(COMPLETED_GAME)
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        const promise = result.current.handleQuizFinish(80)
        // Advance past the retry delay
        await vi.advanceTimersByTimeAsync(3000)
        await promise
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledTimes(2)
      expect(opts.setGame).toHaveBeenCalledWith(COMPLETED_GAME)
      expect(result.current.submitError).toBeNull()
    })

    it('sets submitError after all attempts fail', async () => {
      mockSubmitPvpResult.mockRejectedValue(new Error('Server down'))
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        const promise = result.current.handleQuizFinish(80)
        await vi.advanceTimersByTimeAsync(10000)
        await promise
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledTimes(3)
      expect(result.current.submitError).toContain('Failed to submit')
      expect(result.current.submitError).toContain('Server down')
    })
  })

  describe('handleQuizFinish', () => {
    it('sends finished milestone and calls finishQuiz', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleQuizFinish(90)
      })

      expect(mockSendMilestone).toHaveBeenCalledWith({
        userId: USER_ID,
        type: 'finished',
      })
      expect(opts.finishQuiz).toHaveBeenCalled()
      expect(result.current.myQuizScore).toBe(90)
      expect(result.current.myWpm).toBe(400)
    })

    it('saves quiz result to activity history', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleQuizFinish(75)
      })

      expect(mockSaveQuizResult).toHaveBeenCalledWith(
        {
          text_id: 'text-789',
          score: 75,
          activity_id: expect.any(String),
        },
        USER_ID
      )
    })

    it('does not submit twice (guard against double-call)', async () => {
      mockSubmitPvpResult.mockResolvedValue(null)
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })
      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledOnce()
    })

    it('does nothing without gameId or userId', async () => {
      const opts = makeDefaultOptions({ gameId: null })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      expect(mockSubmitPvpResult).not.toHaveBeenCalled()
    })
  })

  describe('handleReadingComplete', () => {
    it('calls startQuiz and sends started_quiz milestone', () => {
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      // Simulate reading start
      act(() => {
        result.current.handlePositionChange(1)
      })

      act(() => {
        result.current.handleReadingComplete(true)
      })

      expect(opts.startQuiz).toHaveBeenCalled()
      expect(mockSendMilestone).toHaveBeenCalledWith({
        userId: USER_ID,
        type: 'started_quiz',
      })
      expect(result.current.myProgress).toBe(100)
    })

    it('does nothing when isComplete is false', () => {
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handleReadingComplete(false)
      })

      expect(opts.startQuiz).not.toHaveBeenCalled()
    })

    it('does nothing when not in reading phase', () => {
      const opts = makeDefaultOptions({ phase: 'quiz' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handleReadingComplete(true)
      })

      expect(opts.startQuiz).not.toHaveBeenCalled()
    })

    it('only fires once (idempotent)', () => {
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handleReadingComplete(true)
      })
      act(() => {
        result.current.handleReadingComplete(true)
      })

      expect(opts.startQuiz).toHaveBeenCalledOnce()
    })
  })

  describe('retrySubmit', () => {
    it('sets error when no previous result exists', async () => {
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.retrySubmit()
      })

      expect(result.current.submitError).toContain('No result to retry')
      expect(mockSubmitPvpResult).not.toHaveBeenCalled()
    })

    it('retries with saved wpm and score after quiz finish', async () => {
      mockSubmitPvpResult
        .mockRejectedValue(new Error('fail'))
        .mockRejectedValue(new Error('fail'))
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        const promise = result.current.handleQuizFinish(70)
        await vi.advanceTimersByTimeAsync(5000)
        await promise
      })

      expect(result.current.submitError).toBeTruthy()

      mockSubmitPvpResult.mockReset()
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)

      await act(async () => {
        await result.current.retrySubmit()
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        400,
        70
      )
      expect(result.current.submitError).toBeNull()
    })
  })

  describe('handlePositionChange', () => {
    it('sends halfway milestone at 50% progress', () => {
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      // Text has 10 words, so word 5 = 50%
      act(() => {
        result.current.handlePositionChange(5)
      })

      expect(mockSendMilestone).toHaveBeenCalledWith({
        userId: USER_ID,
        type: 'halfway',
      })
    })

    it('sends halfway milestone only once', () => {
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handlePositionChange(5)
      })
      act(() => {
        result.current.handlePositionChange(6)
      })

      const halfwayCalls = mockSendMilestone.mock.calls.filter(
        (call) => (call[0] as { type: string }).type === 'halfway'
      )
      expect(halfwayCalls).toHaveLength(1)
    })

    it('updates myProgress correctly', () => {
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handlePositionChange(3)
      })

      expect(result.current.myProgress).toBe(30)
    })
  })

  describe('handleForfeit', () => {
    it('calls forfeitPvpGame and navigates to lobby on success', async () => {
      mockForfeitPvpGame.mockResolvedValueOnce(undefined)
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleForfeit()
      })

      expect(mockForfeitPvpGame).toHaveBeenCalledWith(GAME_ID, USER_ID)
      expect(mockNavigate).toHaveBeenCalledWith('/pvp')
    })

    it('sets forfeitError on failure', async () => {
      mockForfeitPvpGame.mockRejectedValueOnce(new Error('Network error'))
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleForfeit()
      })

      expect(result.current.forfeitError).toContain('Failed to forfeit')
    })

    it('does nothing without gameId', async () => {
      const opts = makeDefaultOptions({ gameId: null })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleForfeit()
      })

      expect(mockForfeitPvpGame).not.toHaveBeenCalled()
    })

    it('prevents concurrent forfeit calls', async () => {
      let resolveFirst: () => void
      const firstCall = new Promise<void>((r) => {
        resolveFirst = r
      })
      mockForfeitPvpGame.mockReturnValueOnce(firstCall)
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      let p1: Promise<void>
      act(() => {
        p1 = result.current.handleForfeit()
      })
      await act(async () => {
        await result.current.handleForfeit()
      })

      resolveFirst!()
      await act(async () => {
        await p1!
      })

      expect(mockForfeitPvpGame).toHaveBeenCalledOnce()
    })
  })

  describe('beforeunload forfeit', () => {
    it('calls forfeitOnUnload during reading phase', () => {
      const opts = makeDefaultOptions({ phase: 'reading' })
      renderHook(() => usePvpGameCallbacks(opts))

      window.dispatchEvent(new Event('beforeunload'))

      expect(mockForfeitOnUnload).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        'test-token'
      )
    })

    it('calls forfeitOnUnload during quiz phase', () => {
      const opts = makeDefaultOptions({ phase: 'quiz' })
      renderHook(() => usePvpGameCallbacks(opts))

      window.dispatchEvent(new Event('beforeunload'))

      expect(mockForfeitOnUnload).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        'test-token'
      )
    })

    it('does not call forfeitOnUnload when already submitted', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      const opts = makeDefaultOptions({ phase: 'reading' })
      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      window.dispatchEvent(new Event('beforeunload'))

      expect(mockForfeitOnUnload).not.toHaveBeenCalled()
    })

    it('does not call forfeitOnUnload in results phase', () => {
      const opts = makeDefaultOptions({ phase: 'results' })
      renderHook(() => usePvpGameCallbacks(opts))

      window.dispatchEvent(new Event('beforeunload'))

      expect(mockForfeitOnUnload).not.toHaveBeenCalled()
    })

    it('cleans up listener on unmount', () => {
      const spy = vi.spyOn(window, 'removeEventListener')
      const opts = makeDefaultOptions({ phase: 'reading' })
      const { unmount } = renderHook(() => usePvpGameCallbacks(opts))

      unmount()

      expect(spy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
      spy.mockRestore()
    })
  })

  describe('pendingSubmit auto-retry', () => {
    it('submits a pending result only once during StrictMode effect replay', async () => {
      let finish!: (game: PvpGame) => void
      mockSubmitPvpResult.mockImplementation(
        () =>
          new Promise<PvpGame>((resolve) => {
            finish = resolve
          })
      )
      const opts = makeDefaultOptions({
        phase: 'waiting',
        pendingSubmit: { wpm: 300, score: 90 },
      })
      const { result } = renderHook(() => usePvpGameCallbacks(opts), {
        wrapper: StrictMode,
      })
      expect(result.current.myWpm).toBe(300)
      expect(mockSubmitPvpResult).toHaveBeenCalledTimes(1)
      await act(async () => finish(COMPLETED_GAME))
      expect(result.current.submitError).toBeNull()
    })

    it('keeps a pending result untouched until initialized into waiting', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      const opts = makeDefaultOptions({
        phase: 'loading',
        text: null,
        pendingSubmit: { wpm: 300, score: 90 },
      })
      const hook = renderHook((options) => usePvpGameCallbacks(options), {
        initialProps: opts,
      })
      expect(mockSubmitPvpResult).not.toHaveBeenCalled()
      expect(hook.result.current.myWpm).toBe(0)
      hook.rerender({ ...opts, phase: 'waiting', text: MOCK_TEXT })
      await act(async () => vi.runAllTimersAsync())
      expect(hook.result.current.myWpm).toBe(300)
      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        300,
        90
      )
    })

    it('auto-submits when pendingSubmit is provided', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      const opts = makeDefaultOptions({
        phase: 'waiting',
        pendingSubmit: { wpm: 300, score: 90 },
      })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        300,
        90
      )
      expect(result.current.myWpm).toBe(300)
    })

    it('does not auto-submit when pendingSubmit is null', async () => {
      const opts = makeDefaultOptions({
        phase: 'waiting',
        pendingSubmit: null,
      })

      renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockSubmitPvpResult).not.toHaveBeenCalled()
    })

    it('calls showResults when auto-retry returns completed game', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      const opts = makeDefaultOptions({
        phase: 'waiting',
        pendingSubmit: { wpm: 300, score: 90 },
      })

      renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(opts.showResults).toHaveBeenCalled()
      expect(opts.setGame).toHaveBeenCalledWith(COMPLETED_GAME)
    })
  })

  describe('multi-mode activity logging', () => {
    it('logs mode as adaptive when preference is adaptive', () => {
      mockPreferences.mode = 'adaptive'
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handlePositionChange(1)
      })
      act(() => {
        result.current.handleReadingComplete(true)
      })

      expect(logUserActivity).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'adaptive' }),
        USER_ID
      )
    })

    it('logs mode as rsvp when preference is rsvp', () => {
      mockPreferences.mode = 'rsvp'
      const opts = makeDefaultOptions({ phase: 'reading' })

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handlePositionChange(1)
      })
      act(() => {
        result.current.handleReadingComplete(true)
      })

      expect(logUserActivity).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'rsvp' }),
        USER_ID
      )
    })
  })

  describe('adaptive WPM override', () => {
    it('uses adaptive WPM for result submission when in adaptive mode', async () => {
      mockPreferences.mode = 'adaptive'
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handleAdaptiveWpmChange(250)
      })

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        250,
        80
      )
    })

    it('uses raw adaptive WPM without floor', async () => {
      mockPreferences.mode = 'adaptive'
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handleAdaptiveWpmChange(50)
      })

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledWith(GAME_ID, USER_ID, 50, 80)
    })

    it('falls back to preference WPM when reading was not started', async () => {
      mockPreferences.mode = 'standard'
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions()

      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      act(() => {
        result.current.handleAdaptiveWpmChange(250)
      })

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      // No reading started, so measured WPM is null; falls back to preference
      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        400,
        80
      )
    })
  })

  describe('measured WPM from elapsed reading time', () => {
    /** Simulate a complete reading session of the given duration. */
    function simulateReading(
      result: { current: ReturnType<typeof usePvpGameCallbacks> },
      durationMs: number
    ) {
      act(() => {
        result.current.handlePositionChange(1)
      })
      vi.advanceTimersByTime(durationMs)
      act(() => {
        result.current.handleReadingComplete(true)
      })
    }

    it('uses measured WPM instead of preference for quiz submission', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions({ phase: 'reading' })
      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      // 10 words in 6 seconds = 100 WPM
      simulateReading(result, 6000)

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        100,
        80
      )
    })

    it('computes overall score from measured WPM, not preference', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions({ phase: 'reading' })
      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      // 10 words in 6 seconds = 100 WPM
      simulateReading(result, 6000)

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      // Mock computeOverallScore returns wpm + score = 100 + 80 = 180
      expect(result.current.myWpm).toBe(100)
      expect(result.current.myOverallScore).toBe(180)
    })

    it('caps measured WPM at MAX_WPM (2000)', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions({ phase: 'reading' })
      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      // 10 words in 100ms = 6000 WPM, capped to 2000
      simulateReading(result, 100)

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        2000,
        80
      )
    })

    it('logs activity with measured WPM on reading complete', () => {
      const opts = makeDefaultOptions({ phase: 'reading' })
      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      // 10 words in 6 seconds = 100 WPM
      simulateReading(result, 6000)

      expect(logUserActivity).toHaveBeenCalledWith(
        expect.objectContaining({ wpm: 100 }),
        USER_ID
      )
    })

    it('adaptive WPM takes priority over measured WPM', async () => {
      mockPreferences.mode = 'adaptive'
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions({ phase: 'reading' })
      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      // Set adaptive WPM before reading
      act(() => {
        result.current.handleAdaptiveWpmChange(250)
      })

      // 10 words in 6 seconds = 100 WPM measured
      simulateReading(result, 6000)

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      // Should use adaptive WPM (250), not measured (100)
      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        250,
        80
      )
    })

    it('falls back to preference when reading completes instantly', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(null)
      const opts = makeDefaultOptions({ phase: 'reading' })
      const { result } = renderHook(() => usePvpGameCallbacks(opts))

      // 0ms elapsed: calculateWpmFromReading returns 0, measuredWpmRef
      // stays null, so getEffectiveWpm falls back to preference
      act(() => {
        result.current.handlePositionChange(1)
      })
      act(() => {
        result.current.handleReadingComplete(true)
      })

      await act(async () => {
        await result.current.handleQuizFinish(80)
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        400,
        80
      )
    })
  })
})
