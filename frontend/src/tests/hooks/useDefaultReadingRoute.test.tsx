import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { installMockLocalStorage } from '../helpers/mockLocalStorage'

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(),
}))

import { useDefaultReadingRoute } from '../../hooks/useDefaultReadingRoute'
import { useIsMobile } from '../../hooks/useIsMobile'
import { ReadingPreferencesProvider } from '../../context/ReadingPreferencesProvider'
import { STORAGE_KEYS } from '../../constants/storage'
import { ROUTES } from '../../utils/routes'

const { reset: resetLocalStorage } = installMockLocalStorage()
const mockUseIsMobile = vi.mocked(useIsMobile)

function setStoredMode(mode: string) {
  localStorage.setItem(
    STORAGE_KEYS.READING_PREFERENCES,
    JSON.stringify({ mode })
  )
}

function wrap({ children }: { children: React.ReactNode }) {
  return <ReadingPreferencesProvider>{children}</ReadingPreferencesProvider>
}

describe('useDefaultReadingRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLocalStorage()
  })

  it('returns /rsvp on mobile regardless of stored mode', () => {
    mockUseIsMobile.mockReturnValue(true)
    setStoredMode('adaptive')

    const { result } = renderHook(() => useDefaultReadingRoute(), {
      wrapper: wrap,
    })

    expect(result.current).toBe(ROUTES.RSVP)
  })

  it('returns /adaptive on desktop when stored mode is adaptive', () => {
    mockUseIsMobile.mockReturnValue(false)
    setStoredMode('adaptive')

    const { result } = renderHook(() => useDefaultReadingRoute(), {
      wrapper: wrap,
    })

    expect(result.current).toBe(ROUTES.ADAPTIVE)
  })

  it('returns /rsvp on desktop when stored mode is rsvp', () => {
    mockUseIsMobile.mockReturnValue(false)
    setStoredMode('rsvp')

    const { result } = renderHook(() => useDefaultReadingRoute(), {
      wrapper: wrap,
    })

    expect(result.current).toBe(ROUTES.RSVP)
  })

  it('returns /home on desktop when nothing is stored', () => {
    mockUseIsMobile.mockReturnValue(false)

    const { result } = renderHook(() => useDefaultReadingRoute(), {
      wrapper: wrap,
    })

    expect(result.current).toBe(ROUTES.HOME)
  })
})
