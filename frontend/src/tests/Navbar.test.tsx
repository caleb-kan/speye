import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navbar } from '../components/navbar/Navbar'
import * as useAuthModule from '../hooks/useAuth'
import '@testing-library/jest-dom'

vi.mock('../hooks/useAuth')

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
      expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    })

    it('login link navigates to /login', () => {
      renderNavbar()
      expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
        'href',
        '/login'
      )
    })
  })

  describe('Auth Section - Logged In', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', email: 'test@example.com' } as never,
        session: { access_token: 'token' } as never,
        loading: false,
        signOut: vi.fn(),
      })
    })

    it('shows profile link when user is logged in', () => {
      renderNavbar()
      expect(
        screen.getByRole('link', { name: 'Profile settings' })
      ).toBeInTheDocument()
    })

    it('profile link navigates to /settings', () => {
      renderNavbar()
      expect(
        screen.getByRole('link', { name: 'Profile settings' })
      ).toHaveAttribute('href', '/settings')
    })

    it('does not show login link when logged in', () => {
      renderNavbar()
      expect(
        screen.queryByRole('link', { name: 'Log in' })
      ).not.toBeInTheDocument()
    })

    it('shows default avatar with user initial', () => {
      renderNavbar()
      expect(screen.getByText('T')).toBeInTheDocument()
    })
  })
})
