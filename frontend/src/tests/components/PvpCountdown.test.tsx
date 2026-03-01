import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PvpCountdown } from '../../components/pvp/game/PvpCountdown'

describe('PvpCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays initial seconds remaining', () => {
    const startTime = Date.now() + 3000

    render(<PvpCountdown startTime={startTime} onComplete={vi.fn()} />)

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('counts down to zero', () => {
    const startTime = Date.now() + 3000

    render(<PvpCountdown startTime={startTime} onComplete={vi.fn()} />)

    expect(screen.getByText('3')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(screen.getByText('2')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows GO! when countdown reaches zero', () => {
    const startTime = Date.now() + 1000

    render(<PvpCountdown startTime={startTime} onComplete={vi.fn()} />)

    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(screen.getByText('GO!')).toBeInTheDocument()
  })

  it('calls onComplete after GO! display delay', () => {
    const onComplete = vi.fn()
    const startTime = Date.now() + 1000

    render(<PvpCountdown startTime={startTime} onComplete={onComplete} />)

    // Countdown to zero
    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(onComplete).not.toHaveBeenCalled()

    // Wait for GO display delay (600ms)
    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('does not call onComplete before countdown ends', () => {
    const onComplete = vi.fn()
    const startTime = Date.now() + 3000

    render(<PvpCountdown startTime={startTime} onComplete={onComplete} />)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('cleans up intervals on unmount', () => {
    const onComplete = vi.fn()
    const startTime = Date.now() + 3000

    const { unmount } = render(
      <PvpCountdown startTime={startTime} onComplete={onComplete} />
    )

    unmount()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('handles already-passed start time', () => {
    const onComplete = vi.fn()
    const startTime = Date.now() - 1000

    render(<PvpCountdown startTime={startTime} onComplete={onComplete} />)

    // Should show GO! immediately since start time has passed
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText('GO!')).toBeInTheDocument()
  })

  it('has accessible live region', () => {
    const startTime = Date.now() + 3000

    render(<PvpCountdown startTime={startTime} onComplete={vi.fn()} />)

    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeTruthy()
    expect(liveRegion?.getAttribute('aria-atomic')).toBe('true')
  })
})
