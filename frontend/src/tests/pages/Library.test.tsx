import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Library } from '../../pages/Library'
import type { User } from '@supabase/supabase-js'

const { mockState } = vi.hoisted(() => {
  const mockState = {
    user: { id: 'user-123' } as User | null,
    isAdmin: false,
    isOnline: true,
  }
  return { mockState }
})

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockState.user }),
}))

vi.mock('../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockState.isAdmin,
}))

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: mockState.isOnline,
    forceOffline: false,
    setForceOffline: vi.fn(),
    pendingOperations: 0,
    isSyncing: false,
    syncNow: vi.fn(),
  }),
}))

vi.mock('../../hooks/useLibraryTexts', () => ({
  useLibraryTexts: () => ({
    texts: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    setTexts: vi.fn(),
  }),
}))

vi.mock('../../hooks/useLibraryPublicTexts', () => ({
  useLibraryPublicTexts: () => ({
    publicTexts: [],
    publicLoading: false,
    publicError: null,
    refetchPublicTexts: vi.fn(),
  }),
}))

vi.mock('../../hooks/useLibraryBestScores', () => ({
  useLibraryBestScores: () => ({}),
}))

vi.mock('../../hooks/useLibraryLastReadDates', () => ({
  useLibraryLastReadDates: () => ({}),
}))

vi.mock('../../hooks/useComplexitySlider', () => ({
  useComplexitySlider: () => ({
    sliderRef: { current: null },
    resetSlider: vi.fn(),
  }),
}))

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}))

describe('Library page', () => {
  beforeEach(() => {
    mockState.user = { id: 'user-123' } as User
    mockState.isAdmin = false
    mockState.isOnline = true
  })

  describe('upload button visibility', () => {
    it('should show upload button for logged-in user on private tab', () => {
      render(<Library />)

      expect(
        screen.getByRole('button', { name: /Upload Text/i })
      ).toBeInTheDocument()
    })

    it('should not show upload button for non-admin on public tab', async () => {
      const user = userEvent.setup()
      render(<Library />)

      await user.click(screen.getByRole('button', { name: 'Public' }))

      expect(
        screen.queryByRole('button', { name: /Upload Text/i })
      ).not.toBeInTheDocument()
    })

    it('should show upload button for admin on public tab', async () => {
      mockState.isAdmin = true
      const user = userEvent.setup()

      render(<Library />)

      await user.click(screen.getByRole('button', { name: 'Public' }))

      expect(
        screen.getByRole('button', { name: /Upload Text/i })
      ).toBeInTheDocument()
    })

    it('should show upload button for admin on private tab', () => {
      mockState.isAdmin = true

      render(<Library />)

      expect(
        screen.getByRole('button', { name: /Upload Text/i })
      ).toBeInTheDocument()
    })

    it('should not show upload button when offline', () => {
      mockState.isOnline = false

      render(<Library />)

      expect(
        screen.queryByRole('button', { name: /Upload Text/i })
      ).not.toBeInTheDocument()
    })

    it('should not show upload button when not logged in', () => {
      mockState.user = null

      render(<Library />)

      expect(
        screen.queryByRole('button', { name: /Upload Text/i })
      ).not.toBeInTheDocument()
    })
  })
})
