import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePvpMatchmaking } from '../../hooks/usePvpMatchmaking'

const mockMatchmake = vi.fn()
const mockLeaveQueue = vi.fn()
const mockLeaveQueueOnUnload = vi.fn()
const mockGetLatestMatchNotification = vi.fn()

vi.mock('../../services/pvpService', () => ({
  matchmake: (...args: unknown[]) => mockMatchmake(...args),
  leaveQueue: (...args: unknown[]) => mockLeaveQueue(...args),
  leaveQueueOnUnload: (...args: unknown[]) => mockLeaveQueueOnUnload(...args),
  getLatestMatchNotification: (...args: unknown[]) =>
    mockGetLatestMatchNotification(...args),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: { access_token: 'test-token' },
  }),
}))

describe('usePvpMatchmaking', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMatchmake.mockReset()
    mockLeaveQueue.mockReset().mockResolvedValue(undefined)
    mockLeaveQueueOnUnload.mockReset()
    mockGetLatestMatchNotification.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => usePvpMatchmaking(1200))
    expect(result.current.state).toBe('idle')
    expect(result.current.gameId).toBeNull()
    expect(result.current.queueTime).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('transitions to matched when matchmake returns matched', async () => {
    mockMatchmake.mockResolvedValue({
      status: 'matched',
      game_id: 'game-123',
    })

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('matched')
    expect(result.current.gameId).toBe('game-123')
  })

  it('transitions to matched for already_in_game status', async () => {
    mockMatchmake.mockResolvedValue({
      status: 'already_in_game',
      game_id: 'game-456',
    })

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('matched')
    expect(result.current.gameId).toBe('game-456')
  })

  it('transitions to error when matchmake returns error', async () => {
    mockMatchmake.mockResolvedValue({
      status: 'error',
      error_message: 'Queue cooldown active',
    })

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Queue cooldown active')
  })

  it('uses default error message when error_message is missing', async () => {
    mockMatchmake.mockResolvedValue({ status: 'error' })

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.error).toBe('Matchmaking failed')
  })

  it('transitions to searching when queued', async () => {
    mockMatchmake.mockResolvedValue({ status: 'queued' })

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('searching')
    expect(result.current.queueTime).toBe(0)
  })

  it('increments queue timer while searching', async () => {
    mockMatchmake.mockResolvedValue({ status: 'queued' })

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.queueTime).toBe(3)
  })

  it('handles match found via notification polling', async () => {
    mockMatchmake.mockResolvedValue({ status: 'queued' })
    mockGetLatestMatchNotification.mockResolvedValue('game-poll-1')

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('searching')

    // Advance past notification poll interval (2000ms)
    await act(async () => {
      vi.advanceTimersByTime(2000)
      // Allow the async poll callback to resolve
      await vi.runAllTimersAsync()
    })

    expect(result.current.state).toBe('matched')
    expect(result.current.gameId).toBe('game-poll-1')
  })

  it('handles match found via retry matchmake', async () => {
    mockMatchmake
      .mockResolvedValueOnce({ status: 'queued' })
      .mockResolvedValueOnce({
        status: 'matched',
        game_id: 'game-retry-1',
      })
    mockGetLatestMatchNotification.mockResolvedValue(null)

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    // Advance past heartbeat interval (10000ms)
    await act(async () => {
      vi.advanceTimersByTime(10000)
      await vi.runAllTimersAsync()
    })

    expect(result.current.state).toBe('matched')
    expect(result.current.gameId).toBe('game-retry-1')
  })

  it('transitions to error on retry matchmake error', async () => {
    mockMatchmake
      .mockResolvedValueOnce({ status: 'queued' })
      .mockResolvedValueOnce({
        status: 'error',
        error_message: 'Server error',
      })
    mockGetLatestMatchNotification.mockResolvedValue(null)

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    await act(async () => {
      vi.advanceTimersByTime(10000)
      await vi.runAllTimersAsync()
    })

    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Server error')
  })

  it('transitions to error when matchmake throws', async () => {
    mockMatchmake.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Failed to join queue')
  })

  it('cancelQueue resets to idle and calls leaveQueue', async () => {
    mockMatchmake.mockResolvedValue({ status: 'queued' })
    mockLeaveQueue.mockResolvedValue(undefined)

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('searching')

    await act(async () => {
      await result.current.cancelQueue()
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.queueTime).toBe(0)
    expect(result.current.error).toBeNull()
    expect(mockLeaveQueue).toHaveBeenCalledWith('user-1')
  })

  it('cancelQueue handles leaveQueue failure gracefully', async () => {
    mockMatchmake.mockResolvedValue({ status: 'queued' })
    mockLeaveQueue.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    await act(async () => {
      await result.current.cancelQueue()
    })

    // Should surface the error to the user
    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe(
      'Failed to leave queue. Please try again or refresh.'
    )
  })

  it('uses PVP_STARTING_ELO when elo is null', async () => {
    mockMatchmake.mockResolvedValue({
      status: 'matched',
      game_id: 'game-default',
    })

    const { result } = renderHook(() => usePvpMatchmaking(null))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(mockMatchmake).toHaveBeenCalledWith('user-1', 1000)
  })

  it('stops all intervals when match is found', async () => {
    mockMatchmake.mockResolvedValue({ status: 'queued' })
    mockGetLatestMatchNotification.mockResolvedValue('game-stop')

    const { result } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()
    })

    expect(result.current.state).toBe('matched')

    // Queue timer should stop
    const timeAfterMatch = result.current.queueTime
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.queueTime).toBe(timeAfterMatch)
  })

  it('calls leaveQueueOnUnload on unmount when searching', async () => {
    mockMatchmake.mockResolvedValue({ status: 'queued' })

    const { result, unmount } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('searching')

    unmount()

    expect(mockLeaveQueueOnUnload).toHaveBeenCalledWith('user-1', 'test-token')
  })

  it('does not call leaveQueue on unmount when idle', () => {
    mockLeaveQueue.mockResolvedValue(undefined)

    const { unmount } = renderHook(() => usePvpMatchmaking(1200))

    unmount()

    expect(mockLeaveQueue).not.toHaveBeenCalled()
  })

  describe('beforeunload', () => {
    it('calls leaveQueueOnUnload on beforeunload when searching', async () => {
      mockMatchmake.mockResolvedValue({ status: 'queued' })

      const { result } = renderHook(() => usePvpMatchmaking(1200))

      await act(async () => {
        await result.current.joinQueue()
      })

      expect(result.current.state).toBe('searching')

      window.dispatchEvent(new Event('beforeunload'))

      expect(mockLeaveQueueOnUnload).toHaveBeenCalledWith(
        'user-1',
        'test-token'
      )
    })

    it('does not call leaveQueueOnUnload when idle', () => {
      renderHook(() => usePvpMatchmaking(1200))

      window.dispatchEvent(new Event('beforeunload'))

      expect(mockLeaveQueueOnUnload).not.toHaveBeenCalled()
    })

    it('does not call leaveQueueOnUnload when matched', async () => {
      mockMatchmake.mockResolvedValue({
        status: 'matched',
        game_id: 'game-123',
      })

      const { result } = renderHook(() => usePvpMatchmaking(1200))

      await act(async () => {
        await result.current.joinQueue()
      })

      expect(result.current.state).toBe('matched')

      window.dispatchEvent(new Event('beforeunload'))

      expect(mockLeaveQueueOnUnload).not.toHaveBeenCalled()
    })

    it('removes beforeunload listener on unmount', () => {
      const spy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderHook(() => usePvpMatchmaking(1200))

      unmount()

      expect(spy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
      spy.mockRestore()
    })
  })
})
