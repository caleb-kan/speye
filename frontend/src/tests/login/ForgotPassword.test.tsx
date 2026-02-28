import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ForgotPassword } from '../../pages/ForgotPassword'
import * as supabaseModule from '../../../../lib/supabase'
import { createMockAuthError } from '../helpers/mocks'
import '@testing-library/jest-dom'

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
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

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockSupabase = vi.mocked(supabaseModule.supabase)

const renderForgotPassword = () => {
  return render(
    <BrowserRouter>
      <ForgotPassword />
    </BrowserRouter>
  )
}

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the reset password header', () => {
      renderForgotPassword()

      expect(
        screen.getByRole('heading', { name: /reset password/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText('Enter your email to receive reset instructions')
      ).toBeInTheDocument()
    })

    it('renders email input', () => {
      renderForgotPassword()

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    })

    it('renders submit button', () => {
      renderForgotPassword()

      expect(
        screen.getByRole('button', { name: /send reset link/i })
      ).toBeInTheDocument()
    })

    it('renders back to login link', () => {
      renderForgotPassword()

      expect(
        screen.getByRole('button', { name: /back to login/i })
      ).toBeInTheDocument()
    })

    it('renders helper text', () => {
      renderForgotPassword()

      expect(
        screen.getByText("We'll send you instructions to reset your password")
      ).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('email input is required', () => {
      renderForgotPassword()

      expect(screen.getByLabelText(/email address/i)).toBeRequired()
    })

    it('email input has correct type', () => {
      renderForgotPassword()

      expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
        'type',
        'email'
      )
    })
  })

  describe('Submit Flow', () => {
    it('calls resetPasswordForEmail with email', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const user = userEvent.setup()
      renderForgotPassword()

      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      )
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: expect.stringContaining('reset-password'),
        }
      )
    })

    it('shows success message on successful submission', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const user = userEvent.setup()
      renderForgotPassword()

      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      )
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/password reset email sent/i)
        ).toBeInTheDocument()
      })
    })

    it('shows error message on failure', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: createMockAuthError('User not found'),
      })

      const user = userEvent.setup()
      renderForgotPassword()

      await user.type(
        screen.getByLabelText(/email address/i),
        'nonexistent@example.com'
      )
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument()
      })
    })

    it('shows loading state while submitting', async () => {
      let resolvePromise: (value: unknown) => void
      mockSupabase.auth.resetPasswordForEmail.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const user = userEvent.setup()
      renderForgotPassword()

      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      )
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()

      resolvePromise!({ data: {}, error: null })
    })
  })

  describe('Navigation', () => {
    it('navigates to login when clicking back to login', async () => {
      const user = userEvent.setup()
      renderForgotPassword()

      await user.click(screen.getByRole('button', { name: /back to login/i }))

      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      renderForgotPassword()

      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('email input has autocomplete attribute', () => {
      renderForgotPassword()

      expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
        'autocomplete',
        'email'
      )
    })

    it('error message has alert role', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: createMockAuthError('Error occurred'),
      })

      const user = userEvent.setup()
      renderForgotPassword()

      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      )
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('success message has status role', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const user = userEvent.setup()
      renderForgotPassword()

      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      )
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })
  })
})
