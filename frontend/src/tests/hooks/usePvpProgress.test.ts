import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePvpProgress } from '../../hooks/usePvpProgress'

describe('usePvpProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('broadcasts progress when interval has elapsed', () => {
    const sendProgress = vi.fn()
    const { result } = renderHook(() =>
      usePvpProgress({
        userId: 'u1',
        totalWords: 100,
        sendProgress,
        enabled: true,
      })
    )

    act(() => {
      result.current.updateProgress(10, 10)
    })

    expect(sendProgress).toHaveBeenCalledWith({
      userId: 'u1',
      wordIndex: 10,
      totalWords: 100,
      percent: 10,
    })
  })

  it('throttles broadcasts to 500ms intervals', () => {
    const sendProgress = vi.fn()
    const { result } = renderHook(() =>
      usePvpProgress({
        userId: 'u1',
        totalWords: 100,
        sendProgress,
        enabled: true,
      })
    )

    act(() => {
      result.current.updateProgress(10, 10)
    })
    expect(sendProgress).toHaveBeenCalledTimes(1)

    // Call again immediately - should be throttled
    act(() => {
      result.current.updateProgress(20, 20)
    })
    expect(sendProgress).toHaveBeenCalledTimes(1)

    // Advance past throttle interval
    act(() => {
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.updateProgress(30, 30)
    })
    expect(sendProgress).toHaveBeenCalledTimes(2)
    expect(sendProgress).toHaveBeenLastCalledWith({
      userId: 'u1',
      wordIndex: 30,
      totalWords: 100,
      percent: 30,
    })
  })

  it('does not broadcast when disabled', () => {
    const sendProgress = vi.fn()
    const { result } = renderHook(() =>
      usePvpProgress({
        userId: 'u1',
        totalWords: 100,
        sendProgress,
        enabled: false,
      })
    )

    act(() => {
      result.current.updateProgress(10, 10)
    })

    expect(sendProgress).not.toHaveBeenCalled()
  })

  it('does not broadcast when userId is null', () => {
    const sendProgress = vi.fn()
    const { result } = renderHook(() =>
      usePvpProgress({
        userId: null,
        totalWords: 100,
        sendProgress,
        enabled: true,
      })
    )

    act(() => {
      result.current.updateProgress(10, 10)
    })

    expect(sendProgress).not.toHaveBeenCalled()
  })

  it('force-sends 100% progress regardless of throttle', () => {
    const sendProgress = vi.fn()
    const { result } = renderHook(() =>
      usePvpProgress({
        userId: 'u1',
        totalWords: 100,
        sendProgress,
        enabled: true,
      })
    )

    // First call at 50%
    act(() => {
      result.current.updateProgress(50, 50)
    })
    expect(sendProgress).toHaveBeenCalledTimes(1)

    // Immediately call at 100% - should bypass throttle
    act(() => {
      result.current.updateProgress(100, 100)
    })
    expect(sendProgress).toHaveBeenCalledTimes(2)
    expect(sendProgress).toHaveBeenLastCalledWith({
      userId: 'u1',
      wordIndex: 100,
      totalWords: 100,
      percent: 100,
    })
  })

  it('resumes broadcasting after being re-enabled', () => {
    const sendProgress = vi.fn()
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        usePvpProgress({
          userId: 'u1',
          totalWords: 100,
          sendProgress,
          enabled,
        }),
      { initialProps: { enabled: true } }
    )

    act(() => {
      result.current.updateProgress(10, 10)
    })
    expect(sendProgress).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })

    act(() => {
      result.current.updateProgress(20, 20)
    })
    expect(sendProgress).toHaveBeenCalledTimes(1)

    rerender({ enabled: true })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.updateProgress(30, 30)
    })
    expect(sendProgress).toHaveBeenCalledTimes(2)
  })
})
