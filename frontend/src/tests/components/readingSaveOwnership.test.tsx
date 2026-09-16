import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({
  userId: 'account-a',
  getSession: vi.fn(),
  quizDb: vi.fn(),
  logDb: vi.fn(),
}))
vi.mock('../../../../lib/supabase.ts', () => ({
  supabase: { auth: { getSession: state.getSession } },
}))
vi.mock('../../hooks/useAuth.ts', () => ({
  useAuth: () => ({
    user: { id: state.userId },
    session: { access_token: 'token' },
  }),
}))
vi.mock(
  '../../../../backend/supabase/database/userActivity/saveQuizResult.ts',
  () => ({ saveQuizResult: state.quizDb })
)
vi.mock(
  '../../../../backend/supabase/database/userActivity/logUserActivity.ts',
  () => ({ logUserActivity: state.logDb })
)
vi.mock('../../services/networkStatus.ts', () => ({ isOffline: () => false }))
vi.mock('../../services/operationQueue.ts', () => ({
  enqueueOperation: vi.fn(),
}))
vi.mock('../../services/offlineCache.ts', () => ({
  getCachedBestScores: vi.fn(),
  setCachedBestScores: vi.fn(),
}))
vi.mock('../../services/leaderboardService.ts', () => ({
  updateLeaderboardCache: vi.fn(),
}))
vi.mock('../../components/quiz/QuizOverlay.tsx', () => ({
  QuizOverlay: ({ children }: { children: unknown }) => children,
}))
vi.mock('../../components/quiz/QuizResults.tsx', () => ({
  QuizResults: () => null,
}))
import { QuizModal } from '../../components/quiz/QuizModal'
function session() {
  return { data: { session: { user: { id: state.userId } } } }
}
beforeEach(() => {
  vi.clearAllMocks()
  state.userId = 'account-a'
  state.getSession.mockImplementation(async () => session())
  state.quizDb.mockResolvedValue(null)
  state.logDb.mockResolvedValue(null)
})
it('does not save a completed account A quiz as B when initial session lookup waits', async () => {
  let resolve!: (value: unknown) => void
  state.getSession.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r
    })
  )
  const ui = render(
    <QuizModal
      isOpen
      onClose={() => {}}
      questionSet={{
        questions: [
          {
            question: 'Question',
            options: ['Correct', 'Wrong'],
            correctAnswer: 0,
          },
        ],
      }}
      textId="public-text"
      ownerId={null}
    />
  )
  fireEvent.click(screen.getByText('Correct'))
  fireEvent.click(screen.getByText('Finish Quiz'))
  expect(state.getSession).toHaveBeenCalledOnce()
  ui.unmount()
  state.userId = 'account-b'
  await act(async () => resolve(session()))
  expect(state.quizDb).not.toHaveBeenCalled()
})

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../../hooks/useReadingPreferences', () => ({
  useReadingPreferences: () => ({
    preferences: { wpm: 300, mode: 'standard' },
  }),
}))
vi.mock('../../hooks/usePvpGameChannel', () => ({
  usePvpGameChannel: () => ({
    sendProgress: vi.fn(),
    sendMilestone: vi.fn(),
    sendHeartbeat: vi.fn(),
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
  usePvpProgress: () => ({ updateProgress: vi.fn() }),
}))
vi.mock('../../hooks/usePvpAfkDetection', () => ({
  usePvpAfkDetection: () => ({ afkWarning: false, recordActivity: vi.fn() }),
}))
vi.mock('../../services/pvpService', () => ({
  submitPvpResult: vi.fn().mockResolvedValue(null),
  forfeitPvpGame: vi.fn(),
  forfeitOnUnload: vi.fn(),
}))
import { usePvpGameCallbacks } from '../../hooks/usePvpGameCallbacks'
import type { PvpTextData } from '../../types/database'
function pvpOptions() {
  return {
    gameId: 'game-a',
    userId: 'account-a',
    phase: 'reading' as const,
    text: { id: 'public-text', content: 'word '.repeat(100) } as PvpTextData,
    pendingSubmit: null,
    handleGameUpdate: vi.fn(),
    startQuiz: vi.fn(),
    finishQuiz: vi.fn(),
    showResults: vi.fn(),
    setGame: vi.fn(),
  }
}
it.each(['activity', 'quiz'] as const)(
  'does not reassign a PvP %s save when its first session lookup waits',
  async (type) => {
    let resolve!: (value: unknown) => void
    state.getSession.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      })
    )
    const hook = renderHook(() => usePvpGameCallbacks(pvpOptions()))
    await act(async () => {
      if (type === 'activity') {
        hook.result.current.handlePositionChange(1)
        hook.result.current.handleReadingComplete(true)
      } else await hook.result.current.handleQuizFinish(100)
    })
    expect(state.getSession).toHaveBeenCalledOnce()
    hook.unmount()
    state.userId = 'account-b'
    await act(async () => resolve(session()))
    expect(
      type === 'activity' ? state.logDb : state.quizDb
    ).not.toHaveBeenCalled()
  }
)
it('still saves an ordinary quiz for the account that completed it', async () => {
  render(
    <QuizModal
      isOpen
      onClose={() => {}}
      questionSet={{
        questions: [
          {
            question: 'Question',
            options: ['Correct', 'Wrong'],
            correctAnswer: 0,
          },
        ],
      }}
      textId="public-text"
      ownerId={null}
    />
  )
  fireEvent.click(screen.getByText('Correct'))
  await act(async () => {
    fireEvent.click(screen.getByText('Finish Quiz'))
  })
  expect(state.quizDb).toHaveBeenCalledWith(
    { text_id: 'public-text', score: 100 },
    'account-a'
  )
})
