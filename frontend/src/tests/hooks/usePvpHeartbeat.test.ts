import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePvpHeartbeat } from '../../hooks/usePvpHeartbeat'

describe('usePvpHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends heartbeat immediately when enabled', () => {
    const sendHeartbeat = vi.fn()
    renderHook(() =>
      usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled: true })
    )

    expect(sendHeartbeat).toHaveBeenCalledOnce()
    expect(sendHeartbeat).toHaveBeenCalledWith({
      userId: 'u1',
      ts: expect.any(Number),
    })
  })

  it('sends heartbeat at 5s intervals', () => {
    const sendHeartbeat = vi.fn()
    renderHook(() =>
      usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled: true })
    )

    expect(sendHeartbeat).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(sendHeartbeat).toHaveBeenCalledTimes(2)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(sendHeartbeat).toHaveBeenCalledTimes(3)
  })

  it('does not send heartbeat when disabled', () => {
    const sendHeartbeat = vi.fn()
    renderHook(() =>
      usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled: false })
    )

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(sendHeartbeat).not.toHaveBeenCalled()
  })

  it('does not send heartbeat when userId is null', () => {
    const sendHeartbeat = vi.fn()
    renderHook(() =>
      usePvpHeartbeat({ userId: null, sendHeartbeat, enabled: true })
    )

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(sendHeartbeat).not.toHaveBeenCalled()
  })

  it('detects opponent disconnect after 15 seconds without heartbeat', () => {
    const sendHeartbeat = vi.fn()
    const { result } = renderHook(() =>
      usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled: true })
    )

    expect(result.current.opponentDisconnected).toBe(false)

    act(() => {
      vi.advanceTimersByTime(14000)
    })
    expect(result.current.opponentDisconnected).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.opponentDisconnected).toBe(true)
  })

  it('resets disconnect flag when recordHeartbeat is called', () => {
    const sendHeartbeat = vi.fn()
    const { result } = renderHook(() =>
      usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled: true })
    )

    act(() => {
      vi.advanceTimersByTime(16000)
    })
    expect(result.current.opponentDisconnected).toBe(true)

    act(() => {
      result.current.recordHeartbeat()
    })
    expect(result.current.opponentDisconnected).toBe(false)

    // Should not disconnect again for another 15s
    act(() => {
      vi.advanceTimersByTime(14000)
    })
    expect(result.current.opponentDisconnected).toBe(false)
  })

  it('ignores stale heartbeats', () => {
    const sendHeartbeat = vi.fn()
    const { result } = renderHook(() =>
      usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled: true })
    )

    // Trigger disconnect
    act(() => {
      vi.advanceTimersByTime(16000)
    })
    expect(result.current.opponentDisconnected).toBe(true)

    // Record a stale heartbeat (older than 3 * 5000ms = 15s)
    act(() => {
      result.current.recordHeartbeat(Date.now() - 20000)
    })

    // Should still be disconnected - stale heartbeat was ignored
    expect(result.current.opponentDisconnected).toBe(true)
  })

  it('accepts fresh heartbeats with timestamp', () => {
    const sendHeartbeat = vi.fn()
    const { result } = renderHook(() =>
      usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled: true })
    )

    act(() => {
      vi.advanceTimersByTime(16000)
    })
    expect(result.current.opponentDisconnected).toBe(true)

    // Record a fresh heartbeat
    act(() => {
      result.current.recordHeartbeat(Date.now() - 1000)
    })
    expect(result.current.opponentDisconnected).toBe(false)
  })

  it('resets disconnect state when disabled', () => {
    const sendHeartbeat = vi.fn()
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled }),
      { initialProps: { enabled: true } }
    )

    act(() => {
      vi.advanceTimersByTime(16000)
    })
    expect(result.current.opponentDisconnected).toBe(true)

    rerender({ enabled: false })
    expect(result.current.opponentDisconnected).toBe(false)
  })

  it('stops sending when disabled after being enabled', () => {
    const sendHeartbeat = vi.fn()
    const { rerender } = renderHook(
      ({ enabled }) =>
        usePvpHeartbeat({ userId: 'u1', sendHeartbeat, enabled }),
      { initialProps: { enabled: true } }
    )

    expect(sendHeartbeat).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Should only have the initial call
    expect(sendHeartbeat).toHaveBeenCalledTimes(1)
  })
})
