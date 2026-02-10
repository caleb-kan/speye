import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ResetPassword } from '../../pages/ResetPassword'
import * as supabaseModule from '../../../../lib/supabase'
import { createMockAuthError } from '../helpers/mocks'
import '@testing-library/jest-dom'

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
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

const setHashWithRecoveryToken = () => {
  window.location.hash =
    '#access_token=test-token&type=recovery&refresh_token=test-refresh'
}

const renderResetPassword = () => {
  return render(
    <BrowserRouter>
      <ResetPassword />
    </BrowserRouter>
  )
}

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
  })

  describe('Token Validation', () => {
    it('redirects to login when no access token', () => {
      renderResetPassword()

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
      })
    })

    it('redirects to login when type is not recovery', () => {
      window.location.hash = '#access_token=test-token&type=signup'
      renderResetPassword()

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
      })
    })

    it('renders form when valid recovery token is present', () => {
      setHashWithRecoveryToken()
      renderResetPassword()

      expect(
        screen.getByRole('heading', { name: /reset password/i })
      ).toBeInTheDocument()
    })

    it('does not redirect when valid recovery token is present', () => {
      setHashWithRecoveryToken()
      renderResetPassword()

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      setHashWithRecoveryToken()
    })

    it('renders the reset password header', () => {
      renderResetPassword()

      expect(
        screen.getByRole('heading', { name: /reset password/i })
      ).toBeInTheDocument()
      expect(screen.getByText('Enter your new password')).toBeInTheDocument()
    })

    it('renders password input', () => {
      renderResetPassword()

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    })

    it('renders confirm password input', () => {
      renderResetPassword()

      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      renderResetPassword()

      expect(
        screen.getByRole('button', { name: /reset password/i })
      ).toBeInTheDocument()
    })

    it('renders back to login link', () => {
      renderResetPassword()

      expect(
        screen.getByRole('button', { name: /back to login/i })
      ).toBeInTheDocument()
    })

    it('renders password requirements hint', () => {
      renderResetPassword()

      expect(
        screen.getByText('Must be at least 6 characters')
      ).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    beforeEach(() => {
      setHashWithRecoveryToken()
    })

    it('password input is required', () => {
      renderResetPassword()

      expect(screen.getByLabelText(/new password/i)).toBeRequired()
    })

    it('confirm password input is required', () => {
      renderResetPassword()

      expect(screen.getByLabelText(/confirm password/i)).toBeRequired()
    })

    it('password has minimum length of 6', () => {
      renderResetPassword()

      expect(screen.getByLabelText(/new password/i)).toHaveAttribute(
        'minLength',
        '6'
      )
    })

    it('shows error when passwords do not match', async () => {
      renderResetPassword()

      const user = userEvent.setup()

      await user.type(screen.getByLabelText(/new password/i), 'password123')
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'differentpassword'
      )
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
      })

      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled()
    })
  })

  describe('Submit Flow', () => {
    beforeEach(() => {
      setHashWithRecoveryToken()
    })

    it('calls updateUser with new password', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: null,
      } as never)

      const user = userEvent.setup()
      renderResetPassword()

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123')
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'newpassword123'
      )
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      })
    })

    it('shows success message on successful reset', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: null,
      } as never)

      const user = userEvent.setup()
      renderResetPassword()

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123')
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'newpassword123'
      )
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/password updated successfully/i)
        ).toBeInTheDocument()
      })
    })

    it('shows error message on failure', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: createMockAuthError('Password too weak'),
      } as never)

      const user = userEvent.setup()
      renderResetPassword()

      await user.type(screen.getByLabelText(/new password/i), 'weak')
      await user.type(screen.getByLabelText(/confirm password/i), 'weak')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText('Password too weak')).toBeInTheDocument()
      })
    })

    it('shows loading state while submitting', async () => {
      let resolvePromise: (value: unknown) => void
      mockSupabase.auth.updateUser.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const user = userEvent.setup()
      renderResetPassword()

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123')
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'newpassword123'
      )
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()

      resolvePromise!({
        data: { user: null },
        error: null,
      })
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      setHashWithRecoveryToken()
    })

    it('navigates to login when clicking back to login', async () => {
      const user = userEvent.setup()
      renderResetPassword()

      await user.click(screen.getByRole('button', { name: /back to login/i }))

      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      setHashWithRecoveryToken()
    })

    it('password inputs have correct autocomplete', () => {
      renderResetPassword()

      expect(screen.getByLabelText(/new password/i)).toHaveAttribute(
        'autocomplete',
        'new-password'
      )
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute(
        'autocomplete',
        'new-password'
      )
    })

    it('error message has alert role', async () => {
      renderResetPassword()

      const user = userEvent.setup()

      await user.type(screen.getByLabelText(/new password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'different')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('success message has status role', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: null,
      } as never)

      const user = userEvent.setup()
      renderResetPassword()

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123')
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'newpassword123'
      )
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })
  })
})
