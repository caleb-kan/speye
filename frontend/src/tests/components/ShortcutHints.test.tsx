import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ShortcutHints } from '../../components/ShortcutHints'

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}))

import { useIsMobile } from '../../hooks/useIsMobile'

const SESSION_KEY = 'nav-hints-shown'

describe('ShortcutHints', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    vi.mocked(useIsMobile).mockReturnValue(false)
  })

  it('renders hints when sessionStorage has no key', () => {
    render(<ShortcutHints />)
    expect(screen.getByText('Jump back')).toBeInTheDocument()
    expect(screen.getByText('Jump forward')).toBeInTheDocument()
  })

  it('does not render when sessionStorage key exists', () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    const { container } = render(<ShortcutHints />)
    expect(container.innerHTML).toBe('')
  })

  it('does not render on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { container } = render(<ShortcutHints />)
    expect(container.innerHTML).toBe('')
  })

  it('does not set sessionStorage on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(<ShortcutHints />)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('sets sessionStorage and unmounts on animation end', () => {
    render(<ShortcutHints />)
    const forwardHint = screen.getByText('Jump forward').parentElement!
    fireEvent.animationEnd(forwardHint)
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('1')
    expect(screen.queryByText('Jump back')).not.toBeInTheDocument()
  })

  it('sets sessionStorage after timeout fallback', () => {
    vi.useFakeTimers()
    render(<ShortcutHints />)
    expect(screen.getByText('Jump back')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('1')
    expect(screen.queryByText('Jump back')).not.toBeInTheDocument()

    vi.useRealTimers()
  })
})
