import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

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

vi.mock('../../../lib/scoring', () => ({
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
    mockPreferences.wpm = 400
    mockPreferences.mode = 'standard'
  })

  afterEach(() => {
    vi.useRealTimers()
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

      expect(mockSaveQuizResult).toHaveBeenCalledWith({
        text_id: 'text-789',
        score: 75,
      })
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
    it('auto-submits when pendingSubmit is provided', async () => {
      mockSubmitPvpResult.mockResolvedValueOnce(COMPLETED_GAME)
      const opts = makeDefaultOptions({
        phase: 'waiting',
        pendingSubmit: { wpm: 300, score: 90 },
      })

      renderHook(() => usePvpGameCallbacks(opts))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        300,
        90
      )
      expect(opts.finishQuiz).toHaveBeenCalled()
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
        expect.objectContaining({ mode: 'adaptive' })
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
        expect.objectContaining({ mode: 'rsvp' })
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

    it('falls back to preference WPM in standard mode', async () => {
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

      // Should use preference WPM (400), not adaptive WPM
      expect(mockSubmitPvpResult).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        400,
        80
      )
    })
  })
})
