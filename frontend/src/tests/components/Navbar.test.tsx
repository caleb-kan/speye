import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navbar } from '../../components/navbar/Navbar'
import * as useAuthModule from '../../hooks/useAuth'
import { createMockUser, createMockSession } from '../helpers/mocks'
import '@testing-library/jest-dom'

vi.mock('../../hooks/useAuth')
vi.mock('../../hooks/useReadingPreferences', () => ({
  useReadingPreferences: () => ({
    preferences: { mode: 'standard' },
    updatePreferences: vi.fn(),
  }),
}))
vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    forceOffline: false,
    setForceOffline: vi.fn(),
    pendingOperations: 0,
    isSyncing: false,
    syncNow: vi.fn(),
  }),
}))

const mockUseAuth = vi.mocked(useAuthModule.useAuth)

const renderNavbar = () => {
  return render(
    <BrowserRouter>
      <Navbar />
    </BrowserRouter>
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Navigation Items', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
      })
    })

    it('renders Home navigation link', () => {
      renderNavbar()
      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    })

    it('renders Library navigation link', () => {
      renderNavbar()
      expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()
    })

    it('renders Settings navigation link', () => {
      renderNavbar()
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    })

    it('renders main navigation landmark', () => {
      renderNavbar()
      expect(
        screen.getByRole('navigation', { name: 'Main navigation' })
      ).toBeInTheDocument()
    })
  })

  describe('Auth Section - Logged Out', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
      })
    })

    it('shows login link when user is not logged in', () => {
      renderNavbar()
      expect(screen.getByTestId('navbar-login-link')).toBeInTheDocument()
    })

    it('login link navigates to /login', () => {
      renderNavbar()
      expect(screen.getByTestId('navbar-login-link')).toHaveAttribute(
        'href',
        '/login'
      )
    })
  })

  describe('Auth Section - Loading', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signOut: vi.fn(),
      })
    })

    it('shows loading placeholder while auth is loading', () => {
      renderNavbar()
      expect(screen.getByTestId('auth-loading-placeholder')).toBeInTheDocument()
    })

    it('does not show login link while loading', () => {
      renderNavbar()
      expect(screen.queryByTestId('navbar-login-link')).not.toBeInTheDocument()
    })

    it('does not show profile link while loading', () => {
      renderNavbar()
      expect(
        screen.queryByTestId('navbar-profile-link')
      ).not.toBeInTheDocument()
    })
  })

  describe('Auth Section - Logged In', () => {
    const mockUser = createMockUser({
      id: '123',
      email: 'test@example.com',
      user_metadata: { username: 'testuser' },
    })

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: createMockSession(mockUser),
        loading: false,
        signOut: vi.fn(),
      })
    })

    it('shows profile link when user is logged in', () => {
      renderNavbar()
      expect(screen.getByTestId('navbar-profile-link')).toBeInTheDocument()
    })

    it('profile link navigates to /settings', () => {
      renderNavbar()
      expect(screen.getByTestId('navbar-profile-link')).toHaveAttribute(
        'href',
        '/settings'
      )
    })

    it('does not show login link when logged in', () => {
      renderNavbar()
      expect(screen.queryByTestId('navbar-login-link')).not.toBeInTheDocument()
    })

    it('shows default avatar with user initial', () => {
      renderNavbar()
      expect(screen.getByText('T')).toBeInTheDocument()
    })

    it('avatar has accessible label', () => {
      renderNavbar()
      expect(
        screen.getByRole('img', { name: 'Avatar for testuser' })
      ).toBeInTheDocument()
    })
  })
})
