import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { PvpGame } from '../../pages/PvpGame'
import { makeGame } from '../helpers/pvpMockFactory'

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
}))
const gameState = vi.hoisted(() => ({ usePvpGameState: vi.fn() }))
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('../../hooks/usePvpGameState', () => ({
  usePvpGameState: gameState.usePvpGameState,
}))
vi.mock('../../hooks/usePvpGamePlayers', () => ({
  usePvpGamePlayers: () => ({}),
}))
vi.mock('../../hooks/usePvpGameCallbacks', () => ({
  usePvpGameCallbacks: () => ({
    milestones: [],
    myWpm: 123,
    myQuizScore: 40,
    myOverallScore: 17,
  }),
}))

function renderPage(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <NextGame />
      <Routes>
        <Route path="/pvp/:gameId?" element={<PvpGame />} />
      </Routes>
    </MemoryRouter>
  )
}

function NextGame() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/pvp/game-2')}>Next game</button>
}

describe('PvP game prerequisites', () => {
  beforeEach(() => {
    auth.user = null
    auth.loading = false
    gameState.usePvpGameState.mockImplementation(() => ({ phase: 'loading' }))
  })

  it('shows the login prompt for a signed-out visitor while game state stays loading', () => {
    renderPage('/pvp/game-1')
    expect(screen.getByText(/log in/i)).toBeInTheDocument()
  })

  it('shows an invalid game URL for an authenticated visitor without a game ID', () => {
    auth.user = { id: 'reader-a' }
    renderPage('/pvp')
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid game URL.')
  })

  it.each(['player1', 'player2'] as const)(
    'shows the current %s confirmed server result while waiting',
    (player) => {
      auth.user = { id: 'reader-a' }
      gameState.usePvpGameState.mockReturnValue({
        phase: 'waiting',
        game: makeGame({
          player1_id: player === 'player1' ? 'reader-a' : 'reader-b',
          player2_id: player === 'player2' ? 'reader-a' : 'reader-b',
          [`${player}_finished_at`]: '2025-01-01T12:01:00Z',
          [`${player}_wpm`]: 300,
          [`${player}_quiz_score`]: 80,
          [`${player}_overall_score`]: 220,
        }),
      })
      renderPage('/pvp/game-1')
      const waiting = screen.getByRole('status', {
        name: 'Waiting for opponent to finish',
      })
      expect(waiting).toHaveTextContent('300')
      expect(waiting).toHaveTextContent('80%')
      expect(waiting).toHaveTextContent('220')
    }
  )

  it('keeps callback performance visible while the result is still being submitted', () => {
    auth.user = { id: 'reader-a' }
    gameState.usePvpGameState.mockReturnValue({
      phase: 'waiting',
      game: makeGame({ player1_id: 'reader-a', player1_wpm: 999 }),
    })
    renderPage('/pvp/game-1')
    const waiting = screen.getByRole('status', {
      name: 'Waiting for opponent to finish',
    })
    expect(waiting).toHaveTextContent('123')
    expect(waiting).toHaveTextContent('40%')
    expect(waiting).toHaveTextContent('17')
  })

  it('starts a fresh game session when only the route game ID changes', () => {
    auth.user = { id: 'reader-a' }
    gameState.usePvpGameState.mockImplementation(
      function useMockGameState(gameId) {
        const [loadedGameId] = useState(gameId)
        return { phase: 'error', error: loadedGameId }
      }
    )
    renderPage('/pvp/game-1')
    expect(screen.getByRole('alert')).toHaveTextContent('game-1')
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
    expect(screen.getByRole('alert')).toHaveTextContent('game-2')
  })
})
