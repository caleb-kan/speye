import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { StrictMode } from 'react'
import { ResetPassword } from '../../pages/ResetPassword'
import { useAuth } from '../../hooks/useAuth'
import * as supabaseModule from '../../../../lib/supabase'
import {
  createMockAuthContext,
  createMockAuthError,
  createMockUser,
} from '../helpers/mocks'
import '@testing-library/jest-dom'

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}))

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))

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

const setHashWithRecoveryToken = () => {
  window.location.hash =
    '#access_token=test-token&type=recovery&refresh_token=test-refresh'
  vi.mocked(useAuth).mockReturnValue(createMockAuthContext(createMockUser()))
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
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext())
    window.location.hash = ''
  })

  describe('Token Validation', () => {
    it('accepts a recovery session after the SDK consumes the URL hash', () => {
      setHashWithRecoveryToken()
      window.location.hash = ''

      render(
        <StrictMode>
          <BrowserRouter>
            <ResetPassword />
          </BrowserRouter>
        </StrictMode>
      )

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('waits for auth initialization before deciding whether to redirect', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...createMockAuthContext(),
        loading: true,
      })
      const { rerender } = renderResetPassword()
      expect(mockNavigate).not.toHaveBeenCalled()

      vi.mocked(useAuth).mockReturnValue(
        createMockAuthContext(createMockUser())
      )
      rerender(
        <BrowserRouter>
          <ResetPassword />
        </BrowserRouter>
      )

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('rejects an expired recovery URL without an authenticated session', () => {
      window.location.hash = '#access_token=expired-token&type=recovery'
      renderResetPassword()

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
      expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument()
    })

    it('redirects after initialization finishes without a session', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...createMockAuthContext(),
        loading: true,
      })
      const { rerender } = renderResetPassword()
      expect(mockNavigate).not.toHaveBeenCalled()

      vi.mocked(useAuth).mockReturnValue(createMockAuthContext())
      rerender(
        <BrowserRouter>
          <ResetPassword />
        </BrowserRouter>
      )

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })

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

      // Check that button is disabled and shows loading text
      const submitButton = screen.getByRole('button', { name: /resetting/i })
      expect(submitButton).toBeDisabled()

      resolvePromise!({
        data: { user: null },
        error: null,
      })
    })
  })

  describe('Submission lifecycle', () => {
    beforeEach(() => {
      setHashWithRecoveryToken()
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    const submitPassword = () => {
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'newpassword123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'newpassword123' },
      })
      fireEvent.submit(
        screen.getByRole('button', { name: /reset password/i }).closest('form')!
      )
    }

    it('does not redirect when a pending reset succeeds after unmount', async () => {
      let resolveReset = () => {}
      mockSupabase.auth.updateUser.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveReset = () =>
              resolve({ data: { user: createMockUser() }, error: null })
          })
      )
      const { unmount } = renderResetPassword()
      submitPassword()
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledOnce()
      unmount()

      await act(async () => resolveReset())
      act(() => vi.advanceTimersByTime(1000))

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('cancels a successful reset redirect when unmounted', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      })
      const { unmount } = renderResetPassword()
      await act(async () => submitPassword())
      expect(screen.getByRole('status')).toHaveTextContent(
        /password updated successfully/i
      )
      unmount()

      act(() => vi.advanceTimersByTime(1000))

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('keeps successful reset redirects working in StrictMode', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      })
      render(
        <StrictMode>
          <BrowserRouter>
            <ResetPassword />
          </BrowserRouter>
        </StrictMode>
      )
      await act(async () => submitPassword())
      expect(screen.getByRole('status')).toHaveTextContent(
        /password updated successfully/i
      )

      act(() => vi.advanceTimersByTime(1000))

      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true })
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
