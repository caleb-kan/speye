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
import type { PvpTextData } from '../../types/database'

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

import {
  PVP_AFK_FORFEIT_S,
  PVP_MAX_FORFEIT_ATTEMPTS,
} from '../../constants/pvp'

function options() {
  return {
    gameId: GAME_ID,
    userId: USER_ID,
    phase: 'reading' as const,
    text: MOCK_TEXT,
    pendingSubmit: null,
    handleGameUpdate: vi.fn(),
    startQuiz: vi.fn(),
    finishQuiz: vi.fn(),
    showResults: vi.fn(),
    setGame: vi.fn(),
  }
}

describe('PvP callbacks with real AFK detection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockForfeitPvpGame.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries an RPC failure and stops after a confirmed forfeit', async () => {
    mockForfeitPvpGame
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)
    const opts = options()
    const { result } = renderHook(() => usePvpGameCallbacks(opts))
    await act(async () => {
      await vi.advanceTimersByTimeAsync((PVP_AFK_FORFEIT_S + 5) * 1000)
    })
    expect(mockForfeitPvpGame).toHaveBeenCalledTimes(2)
    expect(mockNavigate).toHaveBeenCalledOnce()
    expect(result.current.forfeitError).toBeNull()
  })

  it('caps failed auto-forfeit attempts and keeps the manual retry available', async () => {
    mockForfeitPvpGame.mockRejectedValue(new Error('offline'))
    const opts = options()
    const { result } = renderHook(() => usePvpGameCallbacks(opts))
    await act(async () => {
      await vi.advanceTimersByTimeAsync((PVP_AFK_FORFEIT_S + 10) * 1000)
    })
    expect(mockForfeitPvpGame).toHaveBeenCalledTimes(PVP_MAX_FORFEIT_ATTEMPTS)
    expect(result.current.forfeitError).toBe(
      'Auto-forfeit failed. Please refresh or manually forfeit.'
    )
    expect(mockNavigate).not.toHaveBeenCalled()
    mockForfeitPvpGame.mockResolvedValueOnce(undefined)
    await act(async () => {
      await result.current.handleForfeit()
    })
    expect(mockNavigate).toHaveBeenCalledOnce()
    expect(result.current.forfeitError).toBeNull()
  })
})
