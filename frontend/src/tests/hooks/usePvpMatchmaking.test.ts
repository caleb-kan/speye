import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePvpMatchmaking } from '../../hooks/usePvpMatchmaking'

const mockMatchmake = vi.fn()
const mockLeaveQueue = vi.fn()
const mockLeaveQueueOnUnload = vi.fn()
const mockGetLatestMatchNotification = vi.fn()
const auth = vi.hoisted(() => ({
  user: { id: 'user-1' },
  session: { access_token: 'test-token' },
}))

vi.mock('../../services/pvpService', () => ({
  matchmake: (...args: unknown[]) => mockMatchmake(...args),
  leaveQueue: (...args: unknown[]) => mockLeaveQueue(...args),
  leaveQueueOnUnload: (...args: unknown[]) => mockLeaveQueueOnUnload(...args),
  getLatestMatchNotification: (...args: unknown[]) =>
    mockGetLatestMatchNotification(...args),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => auth,
}))

describe('usePvpMatchmaking', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMatchmake.mockReset()
    mockLeaveQueue.mockReset().mockResolvedValue(null)
    mockLeaveQueueOnUnload.mockReset()
    mockGetLatestMatchNotification.mockReset()
    auth.user.id = 'user-1'
    auth.session.access_token = 'test-token'
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

  it('ignores an old notification response after canceling and rejoining', async () => {
    let resolveOld!: (gameId: string | null) => void
    mockMatchmake.mockResolvedValue({ status: 'queued' })
    mockGetLatestMatchNotification
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          })
      )
      .mockResolvedValue(null)
    const { result } = renderHook(() => usePvpMatchmaking(1200))
    await act(async () => {
      await result.current.joinQueue()
    })
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    await act(async () => {
      await result.current.cancelQueue()
    })
    await act(async () => {
      await result.current.joinQueue()
    })
    await act(async () => {
      resolveOld('old-game')
    })

    expect(result.current.state).toBe('searching')
    expect(result.current.gameId).toBeNull()
  })

  it('still leaves after a pending join fails and then allows rejoining', async () => {
    let rejectOld!: (error: Error) => void
    mockMatchmake
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectOld = reject
          })
      )
      .mockResolvedValue({ status: 'queued' })
    const { result } = renderHook(() => usePvpMatchmaking(1200))
    let oldJoin!: Promise<void>
    act(() => {
      oldJoin = result.current.joinQueue()
    })
    let cancellation!: Promise<void>
    act(() => {
      cancellation = result.current.cancelQueue()
    })
    expect(result.current.state).toBe('canceling')
    await act(async () => {
      rejectOld(new Error('Old request failed'))
      await oldJoin
      await cancellation
    })
    expect(mockLeaveQueue).toHaveBeenCalledWith('user-1', 'test-token')
    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('searching')
    expect(result.current.error).toBeNull()
  })

  it('prevents rejoining until the previous queue deletion finishes', async () => {
    let finishLeave!: () => void
    mockMatchmake.mockResolvedValue({ status: 'queued' })
    mockLeaveQueue.mockReturnValue(
      new Promise<void>((resolve) => {
        finishLeave = resolve
      })
    )
    const { result } = renderHook(() => usePvpMatchmaking(1200))
    await act(async () => {
      await result.current.joinQueue()
    })
    let cancellation!: Promise<void>
    act(() => {
      cancellation = result.current.cancelQueue()
    })
    await act(async () => {
      await result.current.joinQueue()
    })
    expect(mockMatchmake).toHaveBeenCalledTimes(1)
    expect(result.current.state).toBe('canceling')
    await act(async () => {
      finishLeave()
      await cancellation
    })
    expect(result.current.state).toBe('idle')
  })

  it('removes a late-arriving initial queue insertion before cancellation can finish', async () => {
    let finishJoin!: (result: { status: 'queued' }) => void
    let queued = false
    const order: string[] = []
    mockMatchmake.mockReturnValue(
      new Promise<{ status: 'queued' }>((resolve) => {
        finishJoin = resolve
      }).then((value) => {
        queued = true
        order.push('join')
        return value
      })
    )
    mockLeaveQueue.mockImplementation(async () => {
      queued = false
      order.push('leave')
    })
    const { result } = renderHook(() => usePvpMatchmaking(1200))
    let join!: Promise<void>
    let cancellation!: Promise<void>
    act(() => {
      join = result.current.joinQueue()
      cancellation = result.current.cancelQueue()
    })
    await act(async () => {})

    expect(result.current.state).toBe('canceling')
    expect(mockLeaveQueue).not.toHaveBeenCalled()
    await act(async () => {
      finishJoin({ status: 'queued' })
      await join
      await cancellation
    })

    expect(order).toEqual(['join', 'leave'])
    expect(queued).toBe(false)
    expect(result.current.state).toBe('idle')
  })

  it('waits for an in-flight matchmaking retry before removing its queue insertion', async () => {
    let finishRetry!: (result: { status: 'queued' }) => void
    let queued = true
    const order: string[] = []
    mockMatchmake
      .mockResolvedValueOnce({ status: 'queued' })
      .mockReturnValueOnce(
        new Promise<{ status: 'queued' }>((resolve) => {
          finishRetry = resolve
        }).then((value) => {
          queued = true
          order.push('retry')
          return value
        })
      )
    mockGetLatestMatchNotification.mockResolvedValue(null)
    mockLeaveQueue.mockImplementation(async () => {
      queued = false
      order.push('leave')
      return null
    })
    const { result } = renderHook(() => usePvpMatchmaking(1200))
    await act(async () => result.current.joinQueue())
    await act(async () => vi.advanceTimersByTime(10_000))
    expect(mockMatchmake).toHaveBeenCalledTimes(2)
    let cancellation!: Promise<void>
    act(() => {
      cancellation = result.current.cancelQueue()
    })
    await act(async () => {})

    expect(result.current.state).toBe('canceling')
    expect(mockLeaveQueue).not.toHaveBeenCalled()
    await act(async () => {
      finishRetry({ status: 'queued' })
      await cancellation
    })

    expect(order).toEqual(['retry', 'leave'])
    expect(queued).toBe(false)
    expect(result.current.state).toBe('idle')
  })

  it('orders SPA unmount cleanup after a pending join using its captured account and token', async () => {
    let finishJoin!: (result: { status: 'queued' }) => void
    let queued = false
    const order: string[] = []
    mockMatchmake.mockReturnValue(
      new Promise<{ status: 'queued' }>((resolve) => {
        finishJoin = resolve
      }).then((value) => {
        queued = true
        order.push('join')
        return value
      })
    )
    mockLeaveQueue.mockImplementation(async () => {
      queued = false
      order.push('leave')
      return null
    })
    const { result, unmount } = renderHook(() => usePvpMatchmaking(1200))
    let join!: Promise<void>
    act(() => {
      join = result.current.joinQueue()
    })
    unmount()
    auth.user.id = 'next-user'
    auth.session.access_token = 'next-token'
    await act(async () => {})

    expect(mockLeaveQueue).not.toHaveBeenCalled()
    await act(async () => {
      finishJoin({ status: 'queued' })
      await join
    })

    expect(mockLeaveQueue).toHaveBeenCalledExactlyOnceWith(
      'user-1',
      'test-token'
    )
    expect(order).toEqual(['join', 'leave'])
    expect(queued).toBe(false)
  })

  it('blocks a new same-user lobby until the old SPA cleanup has finished deleting', async () => {
    let finishOldJoin!: (result: { status: 'queued' }) => void
    let finishLeave!: () => void
    let queued = false
    const order: string[] = []
    mockMatchmake
      .mockReturnValueOnce(
        new Promise<{ status: 'queued' }>((resolve) => {
          finishOldJoin = resolve
        }).then((value) => {
          queued = true
          order.push('old-join')
          return value
        })
      )
      .mockImplementation(async () => {
        queued = true
        order.push('new-join')
        return { status: 'queued' }
      })
    mockLeaveQueue
      .mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishLeave = resolve
        }).then(() => {
          queued = false
          order.push('leave')
          return null
        })
      )
      .mockResolvedValue(null)
    const oldLobby = renderHook(() => usePvpMatchmaking(1200))
    let oldJoin!: Promise<void>
    act(() => {
      oldJoin = oldLobby.result.current.joinQueue()
    })
    oldLobby.unmount()
    const newLobby = renderHook(() => usePvpMatchmaking(1200))
    let newJoin!: Promise<void>
    act(() => {
      newJoin = newLobby.result.current.joinQueue()
    })
    await act(async () => {})

    expect(mockMatchmake).toHaveBeenCalledTimes(1)
    expect(newLobby.result.current.state).toBe('queuing')
    await act(async () => {
      finishOldJoin({ status: 'queued' })
      await oldJoin
    })
    expect(mockLeaveQueue).toHaveBeenCalledWith('user-1', 'test-token')
    expect(mockMatchmake).toHaveBeenCalledTimes(1)
    await act(async () => {
      finishLeave()
      await newJoin
    })

    expect(order).toEqual(['old-join', 'leave', 'new-join'])
    expect(queued).toBe(true)
    expect(newLobby.result.current.state).toBe('searching')
  })

  it.each(['matched', 'already_in_game'] as const)(
    'keeps a pending %s outcome when the match wins the cancellation race',
    async (status) => {
      let finishJoin!: (value: {
        status: typeof status
        game_id: string
      }) => void
      mockMatchmake.mockReturnValue(
        new Promise((resolve) => {
          finishJoin = resolve
        })
      )
      const { result } = renderHook(() => usePvpMatchmaking(1200))
      let join!: Promise<void>
      let cancellation!: Promise<void>
      act(() => {
        join = result.current.joinQueue()
        cancellation = result.current.cancelQueue()
      })
      expect(result.current.state).toBe('canceling')
      await act(async () => {
        finishJoin({ status, game_id: 'won-race-game' })
        await join
        await cancellation
      })

      expect(result.current.state).toBe('matched')
      expect(result.current.gameId).toBe('won-race-game')
      expect(mockLeaveQueue).not.toHaveBeenCalled()
    }
  )

  it('recovers a committed match reported by leave after the matchmake response is lost', async () => {
    let failJoin!: (error: Error) => void
    mockMatchmake.mockReturnValue(
      new Promise((_resolve, reject) => {
        failJoin = reject
      })
    )
    mockLeaveQueue.mockResolvedValue('hidden-game')
    const { result } = renderHook(() => usePvpMatchmaking(1200))
    let join!: Promise<void>
    let cancellation!: Promise<void>
    act(() => {
      join = result.current.joinQueue()
      cancellation = result.current.cancelQueue()
    })
    await act(async () => {
      failJoin(new Error('Failed to fetch'))
      await join
      await cancellation
    })

    expect(mockLeaveQueue).toHaveBeenCalledWith('user-1', 'test-token')
    expect(result.current.state).toBe('matched')
    expect(result.current.gameId).toBe('hidden-game')
    expect(result.current.error).toBeNull()
  })

  it('stays canceling when a pending initial join finishes before serialized removal', async () => {
    let finishJoin!: (result: { status: 'queued' }) => void
    let finishLeave!: () => void
    mockMatchmake.mockReturnValue(
      new Promise((resolve) => {
        finishJoin = resolve
      })
    )
    mockLeaveQueue.mockReturnValue(
      new Promise<void>((resolve) => {
        finishLeave = resolve
      })
    )
    const { result } = renderHook(() => usePvpMatchmaking(1200))
    let join!: Promise<void>
    let cancellation!: Promise<void>
    act(() => {
      join = result.current.joinQueue()
    })
    expect(result.current.state).toBe('queuing')
    act(() => {
      cancellation = result.current.cancelQueue()
    })

    await act(async () => {
      finishJoin({ status: 'queued' })
      await join
      vi.advanceTimersByTime(5000)
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('canceling')
    expect(mockMatchmake).toHaveBeenCalledTimes(1)
    expect(mockGetLatestMatchNotification).not.toHaveBeenCalled()
    expect(result.current.queueTime).toBe(0)
    await act(async () => {
      finishLeave()
      await cancellation
    })
    expect(result.current.state).toBe('idle')
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
    expect(mockLeaveQueue).toHaveBeenCalledWith('user-1', 'test-token')
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

  it('calls authenticated leaveQueue on SPA unmount when searching', async () => {
    mockMatchmake.mockResolvedValue({ status: 'queued' })

    const { result, unmount } = renderHook(() => usePvpMatchmaking(1200))

    await act(async () => {
      await result.current.joinQueue()
    })

    expect(result.current.state).toBe('searching')

    unmount()

    expect(mockLeaveQueue).toHaveBeenCalledWith('user-1', 'test-token')
  })

  it('does not call leaveQueue on unmount when idle', () => {
    mockLeaveQueue.mockResolvedValue(undefined)

    const { unmount } = renderHook(() => usePvpMatchmaking(1200))

    unmount()

    expect(mockLeaveQueue).not.toHaveBeenCalled()
  })

  describe('beforeunload', () => {
    it.each(['queuing', 'canceling'] as const)(
      'sends one authenticated unload cleanup while %s with a pending join',
      async (state) => {
        let finishJoin!: (result: { status: 'queued' }) => void
        let finishLeave!: () => void
        mockMatchmake.mockReturnValue(
          new Promise((resolve) => {
            finishJoin = resolve
          })
        )
        mockLeaveQueue.mockReturnValue(
          new Promise<void>((resolve) => {
            finishLeave = resolve
          })
        )
        const { result, unmount } = renderHook(() => usePvpMatchmaking(1200))
        let join!: Promise<void>
        let cancellation: Promise<void> | undefined
        act(() => {
          join = result.current.joinQueue()
        })
        if (state === 'canceling') {
          act(() => {
            cancellation = result.current.cancelQueue()
          })
        }
        expect(result.current.state).toBe(state)

        window.dispatchEvent(new Event('beforeunload'))
        window.dispatchEvent(new Event('beforeunload'))
        unmount()

        expect(mockLeaveQueueOnUnload).toHaveBeenCalledExactlyOnceWith(
          'user-1',
          'test-token'
        )
        await act(async () => {
          finishJoin({ status: 'queued' })
          finishLeave()
          await join
          await cancellation
          vi.advanceTimersByTime(5000)
        })
        expect(mockGetLatestMatchNotification).not.toHaveBeenCalled()
        expect(mockMatchmake).toHaveBeenCalledTimes(1)
      }
    )

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
