import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationSubscription } from '../../hooks/useNotificationSubscription'
import { usePvpGameChannel } from '../../hooks/usePvpGameChannel'

type TestChannel = {
  handlers: Map<string, (payload: never) => void>
  status?: (status: string) => void
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  removeChannel: vi.fn(),
  realtime: { setAuth: vi.fn() },
}))
vi.mock('../../../../lib/supabase', () => ({ supabase: mocks }))

let channels: TestChannel[]
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.realtime.setAuth.mockReset().mockResolvedValue(undefined)
  channels = []
  mocks.channel.mockImplementation(() => {
    const channel: TestChannel = {
      handlers: new Map(),
      on: vi.fn(),
      subscribe: vi.fn(),
      send: vi.fn().mockResolvedValue('ok'),
    }
    channel.on.mockImplementation((type, config, callback) => {
      channel.handlers.set(type === 'broadcast' ? config.event : type, callback)
      return channel
    })
    channel.subscribe.mockImplementation((callback) => {
      channel.status = callback
      return channel
    })
    channels.push(channel)
    return channel
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('realtime subscription ownership', () => {
  it('ignores notification events and subscription status from the old account', () => {
    const onDelete = vi.fn()
    const { result, rerender } = renderHook(
      ({ userId }) => useNotificationSubscription(userId, { onDelete }),
      { initialProps: { userId: 'reader-a' } }
    )
    const oldChannel = channels[0]
    rerender({ userId: 'reader-b' })
    act(() => channels[1].status?.('SUBSCRIBED'))
    act(() => {
      oldChannel.handlers.get('postgres_changes')?.({
        eventType: 'DELETE',
        old: { id: 'old-notification' },
      } as never)
      oldChannel.status?.('CLOSED')
    })

    expect(onDelete).not.toHaveBeenCalled()
    expect(result.current.status).toBe('connected')
    act(() => vi.advanceTimersByTime(1000))
    expect(mocks.channel).toHaveBeenCalledTimes(2)
  })

  it('authenticates before joining a private game channel with broadcast acknowledgments', async () => {
    let finishAuth!: () => void
    mocks.realtime.setAuth.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishAuth = resolve
      })
    )
    renderHook(() => usePvpGameChannel('game-a', 'reader-a', {}))

    expect(mocks.realtime.setAuth).toHaveBeenCalledOnce()
    expect(mocks.channel).not.toHaveBeenCalled()
    await act(async () => finishAuth())

    expect(mocks.channel).toHaveBeenCalledExactlyOnceWith('pvp-game:game-a', {
      config: { private: true, broadcast: { ack: true } },
    })
  })

  it('does not create an old game channel after its authentication finishes late', async () => {
    let finishOldAuth!: () => void
    mocks.realtime.setAuth.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishOldAuth = resolve
      })
    )
    const { rerender } = renderHook(
      ({ gameId }) => usePvpGameChannel(gameId, 'reader-a', {}),
      { initialProps: { gameId: 'game-a' } }
    )
    rerender({ gameId: 'game-b' })
    await act(async () => {})
    await act(async () => finishOldAuth())

    expect(mocks.channel).toHaveBeenCalledExactlyOnceWith('pvp-game:game-b', {
      config: { private: true, broadcast: { ack: true } },
    })
  })

  it('does not initialize or retry a game channel after unmount during authentication', async () => {
    let rejectAuth!: (error: Error) => void
    mocks.realtime.setAuth.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectAuth = reject
      })
    )
    const { unmount } = renderHook(() =>
      usePvpGameChannel('game-a', 'reader-a', {})
    )
    expect(mocks.realtime.setAuth).toHaveBeenCalledOnce()
    unmount()
    await act(async () => {
      rejectAuth(new Error('Authentication expired'))
      vi.advanceTimersByTime(60_000)
    })

    expect(mocks.channel).not.toHaveBeenCalled()
    expect(mocks.realtime.setAuth).toHaveBeenCalledOnce()
  })

  it('retries authentication failure before creating a private channel', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.realtime.setAuth.mockRejectedValueOnce(
      new Error('Authentication unavailable')
    )
    renderHook(() => usePvpGameChannel('game-a', 'reader-a', {}))
    await act(async () => {})

    expect(mocks.channel).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1000))

    expect(mocks.realtime.setAuth).toHaveBeenCalledTimes(2)
    expect(mocks.channel).toHaveBeenCalledExactlyOnceWith('pvp-game:game-a', {
      config: { private: true, broadcast: { ack: true } },
    })
    log.mockRestore()
  })

  it('keeps the private channel contract when a subscription is rejected', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderHook(() => usePvpGameChannel('game-a', 'reader-a', {}))
    await act(async () => {})
    await act(async () => {
      channels[0].status?.('CHANNEL_ERROR')
      vi.advanceTimersByTime(1000)
    })

    expect(mocks.channel.mock.calls).toEqual([
      [
        'pvp-game:game-a',
        { config: { private: true, broadcast: { ack: true } } },
      ],
      [
        'pvp-game:game-a',
        { config: { private: true, broadcast: { ack: true } } },
      ],
    ])
    log.mockRestore()
  })

  it('ignores old game broadcasts and close events after changing games', async () => {
    const onProgress = vi.fn()
    const { rerender } = renderHook(
      ({ gameId }) => usePvpGameChannel(gameId, 'reader-a', { onProgress }),
      { initialProps: { gameId: 'game-a' } }
    )
    await act(async () => {})
    const oldChannel = channels[0]
    rerender({ gameId: 'game-b' })
    await act(async () => {})
    act(() => {
      oldChannel.handlers.get('progress')?.({
        payload: {
          userId: 'opponent',
          wordIndex: 1,
          totalWords: 10,
          percent: 10,
        },
      } as never)
      oldChannel.status?.('CLOSED')
      vi.advanceTimersByTime(1000)
    })

    expect(onProgress).not.toHaveBeenCalled()
    expect(mocks.channel).toHaveBeenCalledTimes(2)
  })
})
