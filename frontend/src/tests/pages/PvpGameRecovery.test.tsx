import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PvpGame } from '../../pages/PvpGame'
import { makeGame } from '../helpers/pvpMockFactory'
import type { PvpGame as Game } from '../../types/database'

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  getText: vi.fn(),
  update: null as ((game: Game) => void) | null,
}))
vi.mock('../../services/pvpService', () => ({
  getPvpGame: mocks.getGame,
  getTextForPvp: mocks.getText,
  getServerTime: async () => new Date().toISOString(),
  markReady: vi.fn(),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('../../hooks/usePvpGamePlayers', () => ({
  usePvpGamePlayers: () => ({ loaded: true }),
}))
vi.mock('../../hooks/usePvpGameCallbacks', () => ({
  usePvpGameCallbacks: (options: {
    handleGameUpdate: (game: Game) => void
  }) => {
    mocks.update = options.handleGameUpdate
    return { myWpm: 0, myQuizScore: 0, myOverallScore: 0, milestones: [] }
  },
}))
vi.mock('../../components/pvp/game/PvpReadingPhase', () => ({
  PvpReadingPhase: () => null,
}))

beforeEach(() => {
  sessionStorage.clear()
  mocks.getText.mockResolvedValue({
    id: 'text-1',
    title: 'Recovery test',
    content: 'A valid reading text.',
    source: null,
    fiction: false,
    complexity: 5,
    quiz: {
      questionSets: [
        {
          questions: [
            { question: 'Question?', options: ['A', 'B'], correctAnswer: 0 },
          ],
        },
      ],
    },
  })
})

describe('confirmed waiting performance', () => {
  it.each(['player1', 'player2'] as const)(
    'preserves %s performance when an older active snapshot arrives',
    async (player) => {
      const active = makeGame({
        player1_id: player === 'player1' ? 'user-1' : 'user-2',
        player2_id: player === 'player2' ? 'user-1' : 'user-2',
        reading_started_at: new Date(Date.now() - 10000).toISOString(),
        [`${player}_finished_at`]: new Date().toISOString(),
        [`${player}_wpm`]: 300,
        [`${player}_quiz_score`]: 80,
        [`${player}_overall_score`]: 220,
      })
      mocks.getGame.mockResolvedValue(active)
      render(
        <MemoryRouter initialEntries={['/pvp/game-1']}>
          <Routes>
            <Route path="/pvp/:gameId" element={<PvpGame />} />
          </Routes>
        </MemoryRouter>
      )
      const waiting = await screen.findByRole('status', {
        name: 'Waiting for opponent to finish',
      })
      expect(within(waiting).getByText('300')).toBeVisible()
      act(() =>
        mocks.update!({
          ...active,
          [`${player}_finished_at`]: null,
          [`${player}_wpm`]: null,
          [`${player}_quiz_score`]: null,
          [`${player}_overall_score`]: null,
        })
      )
      expect(within(waiting).getByText('300')).toBeVisible()
      expect(within(waiting).getByText('80%')).toBeVisible()
      expect(within(waiting).getByText('220')).toBeVisible()
    }
  )
})
