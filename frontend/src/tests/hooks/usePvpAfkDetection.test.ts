import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePvpAfkDetection } from '../../hooks/usePvpAfkDetection'

describe('usePvpAfkDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not show warning before 15 seconds', () => {
    const onForfeit = vi.fn()
    const { result } = renderHook(() =>
      usePvpAfkDetection({ onForfeit, enabled: true })
    )

    act(() => {
      vi.advanceTimersByTime(14000)
    })

    expect(result.current.afkWarning).toBe(false)
    expect(onForfeit).not.toHaveBeenCalled()
  })

  it('shows warning at 15 seconds', () => {
    const onForfeit = vi.fn()
    const { result } = renderHook(() =>
      usePvpAfkDetection({ onForfeit, enabled: true })
    )

    act(() => {
      vi.advanceTimersByTime(15000)
    })

    expect(result.current.afkWarning).toBe(true)
    expect(onForfeit).not.toHaveBeenCalled()
  })

  it('calls onForfeit at 30 seconds', () => {
    const onForfeit = vi.fn()
    renderHook(() => usePvpAfkDetection({ onForfeit, enabled: true }))

    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(onForfeit).toHaveBeenCalledOnce()
  })

  it('calls onForfeit exactly once then stops', () => {
    const onForfeit = vi.fn()
    renderHook(() => usePvpAfkDetection({ onForfeit, enabled: true }))

    act(() => {
      vi.advanceTimersByTime(35000)
    })

    // Interval is cleared after forfeit fires, so only one call
    expect(onForfeit).toHaveBeenCalledOnce()
  })

  it('resets warning when recordActivity is called', () => {
    const onForfeit = vi.fn()
    const { result } = renderHook(() =>
      usePvpAfkDetection({ onForfeit, enabled: true })
    )

    act(() => {
      vi.advanceTimersByTime(16000)
    })
    expect(result.current.afkWarning).toBe(true)

    act(() => {
      result.current.recordActivity()
    })
    expect(result.current.afkWarning).toBe(false)

    // After recording activity, timer resets
    act(() => {
      vi.advanceTimersByTime(14000)
    })
    expect(result.current.afkWarning).toBe(false)
    expect(onForfeit).not.toHaveBeenCalled()
  })

  it('does not check when disabled', () => {
    const onForfeit = vi.fn()
    const { result } = renderHook(() =>
      usePvpAfkDetection({ onForfeit, enabled: false })
    )

    act(() => {
      vi.advanceTimersByTime(60000)
    })

    expect(result.current.afkWarning).toBe(false)
    expect(onForfeit).not.toHaveBeenCalled()
  })

  it('retries forfeit when async onForfeit rejects', async () => {
    const onForfeit = vi.fn().mockRejectedValue(new Error('network'))
    renderHook(() => usePvpAfkDetection({ onForfeit, enabled: true }))

    // First forfeit attempt at 30s
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    expect(onForfeit).toHaveBeenCalledTimes(1)

    // Let the rejected promise settle and allow the next interval tick
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Second attempt should fire on the next interval check
    expect(onForfeit).toHaveBeenCalledTimes(2)
  })

  it('calls onForfeitFailed after max forfeit attempts', async () => {
    const onForfeit = vi.fn().mockRejectedValue(new Error('network'))
    const onForfeitFailed = vi.fn()
    renderHook(() =>
      usePvpAfkDetection({ onForfeit, onForfeitFailed, enabled: true })
    )

    // Exhaust all 3 attempts: trigger at 30s, then tick each second
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onForfeit).toHaveBeenCalledTimes(3)
    expect(onForfeitFailed).toHaveBeenCalledWith(
      expect.stringContaining('Auto-forfeit failed')
    )
  })

  it('resets when re-enabled', () => {
    const onForfeit = vi.fn()
    const { result, rerender } = renderHook(
      ({ enabled }) => usePvpAfkDetection({ onForfeit, enabled }),
      { initialProps: { enabled: true } }
    )

    act(() => {
      vi.advanceTimersByTime(16000)
    })
    expect(result.current.afkWarning).toBe(true)

    // Disable
    rerender({ enabled: false })
    expect(result.current.afkWarning).toBe(false)

    // Re-enable - timer should reset from zero
    rerender({ enabled: true })
    act(() => {
      vi.advanceTimersByTime(14000)
    })
    expect(result.current.afkWarning).toBe(false)
    expect(onForfeit).not.toHaveBeenCalled()
  })
})
