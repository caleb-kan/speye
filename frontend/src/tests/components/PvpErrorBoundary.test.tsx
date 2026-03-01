import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PvpErrorBoundary } from '../../components/pvp/game/PvpErrorBoundary'

const mockForfeitPvpGame = vi.fn()
const mockForfeitOnUnload = vi.fn()

vi.mock('../../services/pvpService', () => ({
  forfeitPvpGame: (...args: unknown[]) => mockForfeitPvpGame(...args),
  forfeitOnUnload: (...args: unknown[]) => mockForfeitOnUnload(...args),
}))

function ThrowingChild({ error }: { error?: Error }) {
  if (error) throw error
  return <div>child content</div>
}

const GAME_ID = 'game-123'
const USER_ID = 'user-456'
const ACCESS_TOKEN = 'token-789'

describe('PvpErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error', () => {
    render(
      <PvpErrorBoundary
        onNavigateToLobby={vi.fn()}
        gameId={GAME_ID}
        userId={USER_ID}
      >
        <div>child content</div>
      </PvpErrorBoundary>
    )

    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    mockForfeitPvpGame.mockResolvedValueOnce(undefined)

    render(
      <PvpErrorBoundary
        onNavigateToLobby={vi.fn()}
        gameId={GAME_ID}
        userId={USER_ID}
      >
        <ThrowingChild error={new Error('Test crash')} />
      </PvpErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    expect(screen.getByText(/Test crash/)).toBeInTheDocument()
  })

  it('calls forfeitPvpGame on error', () => {
    mockForfeitPvpGame.mockResolvedValueOnce(undefined)

    render(
      <PvpErrorBoundary
        onNavigateToLobby={vi.fn()}
        gameId={GAME_ID}
        userId={USER_ID}
      >
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    expect(mockForfeitPvpGame).toHaveBeenCalledWith(GAME_ID, USER_ID)
  })

  it('shows forfeit success message', async () => {
    mockForfeitPvpGame.mockResolvedValueOnce(undefined)

    render(
      <PvpErrorBoundary
        onNavigateToLobby={vi.fn()}
        gameId={GAME_ID}
        userId={USER_ID}
      >
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    // Wait for the async forfeit to resolve
    await vi.waitFor(() => {
      expect(screen.getByText(/forfeited successfully/)).toBeInTheDocument()
    })
  })

  it('falls back to keepalive on forfeit failure and hides retry button', async () => {
    mockForfeitPvpGame.mockRejectedValueOnce(new Error('RPC failed'))

    render(
      <PvpErrorBoundary
        onNavigateToLobby={vi.fn()}
        gameId={GAME_ID}
        userId={USER_ID}
        accessToken={ACCESS_TOKEN}
      >
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    await vi.waitFor(() => {
      expect(mockForfeitOnUnload).toHaveBeenCalledWith(
        GAME_ID,
        USER_ID,
        ACCESS_TOKEN
      )
    })

    // Keepalive was fired so retry button should not appear
    expect(screen.queryByText('Retry Forfeit')).not.toBeInTheDocument()
  })

  it('shows retry button when forfeit fails without access token', async () => {
    mockForfeitPvpGame.mockRejectedValueOnce(new Error('RPC failed'))

    render(
      <PvpErrorBoundary
        onNavigateToLobby={vi.fn()}
        gameId={GAME_ID}
        userId={USER_ID}
      >
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    await vi.waitFor(() => {
      expect(screen.getByText('Retry Forfeit')).toBeInTheDocument()
    })

    // Keepalive should not have been called without a token
    expect(mockForfeitOnUnload).not.toHaveBeenCalled()
  })

  it('retries forfeit when retry button is clicked', async () => {
    mockForfeitPvpGame
      .mockRejectedValueOnce(new Error('first fail'))
      .mockResolvedValueOnce(undefined)

    render(
      <PvpErrorBoundary
        onNavigateToLobby={vi.fn()}
        gameId={GAME_ID}
        userId={USER_ID}
      >
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    await vi.waitFor(() => {
      expect(screen.getByText('Retry Forfeit')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Retry Forfeit'))

    await vi.waitFor(() => {
      expect(mockForfeitPvpGame).toHaveBeenCalledTimes(2)
      expect(screen.getByText(/forfeited successfully/)).toBeInTheDocument()
    })
  })

  it('calls onNavigateToLobby when return button is clicked', () => {
    mockForfeitPvpGame.mockResolvedValueOnce(undefined)
    const onNavigate = vi.fn()

    render(
      <PvpErrorBoundary
        onNavigateToLobby={onNavigate}
        gameId={GAME_ID}
        userId={USER_ID}
      >
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    fireEvent.click(screen.getByText('Return to Lobby'))
    expect(onNavigate).toHaveBeenCalled()
  })

  it('skips forfeit when gameId is missing', () => {
    render(
      <PvpErrorBoundary onNavigateToLobby={vi.fn()}>
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    expect(mockForfeitPvpGame).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('skips forfeit when userId is missing', () => {
    render(
      <PvpErrorBoundary onNavigateToLobby={vi.fn()} gameId={GAME_ID}>
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    expect(mockForfeitPvpGame).not.toHaveBeenCalled()
  })

  it('does not show retry button when forfeit succeeded', async () => {
    mockForfeitPvpGame.mockResolvedValueOnce(undefined)

    render(
      <PvpErrorBoundary
        onNavigateToLobby={vi.fn()}
        gameId={GAME_ID}
        userId={USER_ID}
      >
        <ThrowingChild error={new Error('crash')} />
      </PvpErrorBoundary>
    )

    await vi.waitFor(() => {
      expect(screen.getByText(/forfeited successfully/)).toBeInTheDocument()
    })

    expect(screen.queryByText('Retry Forfeit')).not.toBeInTheDocument()
  })
})
