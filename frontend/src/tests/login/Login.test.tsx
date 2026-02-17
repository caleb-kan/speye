import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Login } from '../../pages/Login'
import * as useAuthModule from '../../hooks/useAuth'
import * as supabaseModule from '../../../../lib/supabase'
import {
  createMockUser,
  createMockSession,
  createMockAuthError,
} from '../helpers/mocks'
import '@testing-library/jest-dom'

vi.mock('../../hooks/useAuth')
vi.mock('../../assets/GoogleIcon.svg', () => ({
  default: 'google-icon.svg',
}))
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}))

vi.mock('../../services/userService', () => ({
  isUsernameAvailable: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockUseAuth = vi.mocked(useAuthModule.useAuth)

// Type the auth methods explicitly
const mockAuthSignUp = vi.fn()
const mockAuthSignInWithPassword = vi.fn()
const mockAuthSignInWithOAuth = vi.fn()

// Create a properly typed mock for supabase
const mockSupabase = {
  auth: {
    signUp: mockAuthSignUp,
    signInWithPassword: mockAuthSignInWithPassword,
    signInWithOAuth: mockAuthSignInWithOAuth,
  },
}

// Override the module mock with our typed version
vi.mocked(supabaseModule).supabase =
  mockSupabase as unknown as typeof supabaseModule.supabase

import * as userServiceModule from '../../services/userService'
const mockUserService = vi.mocked(userServiceModule)

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    })
    mockUserService.isUsernameAvailable.mockResolvedValue(true)
  })

  describe('Rendering', () => {
    it('renders login form by default', () => {
      renderLogin()

      expect(
        screen.getByRole('heading', { name: /welcome back/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText('Sign in to continue reading')
      ).toBeInTheDocument()
    })

    it('renders email input', () => {
      renderLogin()

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    })

    it('renders password input', () => {
      renderLogin()

      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    })

    it('renders login button', () => {
      renderLogin()

      expect(
        screen.getByRole('button', { name: /^sign in$/i })
      ).toBeInTheDocument()
    })

    it('renders sign up toggle link', () => {
      renderLogin()

      expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /^sign up$/i })
      ).toBeInTheDocument()
    })

    it('renders continue without account link', () => {
      renderLogin()

      expect(
        screen.getByRole('button', { name: /continue without an account/i })
      ).toBeInTheDocument()
    })
  })

  describe('Sign Up Toggle', () => {
    it('switches to sign up mode when clicking sign up link', async () => {
      const user = userEvent.setup()
      renderLogin()

      await user.click(screen.getByRole('button', { name: /^sign up$/i }))

      expect(
        screen.getByRole('heading', { name: /create account/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText('Sign up to save your progress')
      ).toBeInTheDocument()
    })

    it('shows password requirements in sign up mode', async () => {
      const user = userEvent.setup()
      renderLogin()

      await user.click(screen.getByRole('button', { name: /^sign up$/i }))

      expect(
        screen.getByText('Must be at least 6 characters')
      ).toBeInTheDocument()
    })

    it('switches back to login mode', async () => {
      const user = userEvent.setup()
      renderLogin()

      await user.click(screen.getByRole('button', { name: /^sign up$/i }))
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      expect(
        screen.getByRole('heading', { name: /welcome back/i })
      ).toBeInTheDocument()
    })

    it('clears error when toggling modes', async () => {
      mockAuthSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError('Invalid credentials'),
      })

      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /^sign up$/i }))

      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('email input is required', () => {
      renderLogin()

      expect(screen.getByLabelText(/email/i)).toBeRequired()
    })

    it('password input is required', () => {
      renderLogin()

      expect(screen.getByLabelText(/password/i)).toBeRequired()
    })

    it('password has minimum length of 6', () => {
      renderLogin()

      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        'minLength',
        '6'
      )
    })
  })

  describe('Login Flow', () => {
    it('calls signInWithPassword with form data', async () => {
      const mockUser = createMockUser({ id: '123', email: 'test@example.com' })
      mockAuthSignInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: createMockSession(mockUser),
        },
        error: null,
      })

      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      expect(mockAuthSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('shows loading state while submitting', async () => {
      let resolvePromise: (value: unknown) => void
      mockAuthSignInWithPassword.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()

      await act(async () => {
        resolvePromise!({
          data: { user: null, session: null },
          error: null,
        })
      })
    })

    it('shows success message on successful login', async () => {
      const mockUser = createMockUser({ id: '123' })
      mockAuthSignInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: createMockSession(mockUser),
        },
        error: null,
      })

      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      await waitFor(() => {
        expect(screen.getByText('Login successful!')).toBeInTheDocument()
      })
    })

    it('shows error message on login failure', async () => {
      mockAuthSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError('Invalid login credentials'),
      })

      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      await waitFor(() => {
        expect(
          screen.getByText('Invalid login credentials')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Sign Up Flow', () => {
    const switchToSignUp = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: /^sign up$/i }))
    }

    it('calls signUp with form data', async () => {
      const mockUser = createMockUser({ id: '123', email: 'new@example.com' })
      mockAuthSignUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: null,
        },
        error: null,
      })

      const user = userEvent.setup()
      renderLogin()
      await switchToSignUp(user)

      await user.type(screen.getByLabelText(/username/i), 'testuser')
      await user.type(screen.getByLabelText(/email/i), 'new@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      expect(mockAuthSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            username: 'testuser',
          },
        },
      })
    })

    it('shows verification message on successful sign up', async () => {
      const mockUser = createMockUser({ id: '123' })
      mockAuthSignUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: null,
        },
        error: null,
      })

      const user = userEvent.setup()
      renderLogin()
      await switchToSignUp(user)

      await user.type(screen.getByLabelText(/username/i), 'testuser')
      await user.type(screen.getByLabelText(/email/i), 'new@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/check your email to verify your account/i)
        ).toBeInTheDocument()
      })
    })

    it('shows error message on sign up failure', async () => {
      mockAuthSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError('User already registered'),
      })

      const user = userEvent.setup()
      renderLogin()
      await switchToSignUp(user)

      await user.type(screen.getByLabelText(/username/i), 'testuser')
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText('User already registered')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('redirects to home if already logged in', async () => {
      const mockUser = createMockUser({ id: '123', email: 'test@example.com' })
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: createMockSession(mockUser),
        loading: false,
        signOut: vi.fn(),
      })

      renderLogin()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true })
      })
    })

    it('navigates to home when clicking "Continue without an account"', async () => {
      const user = userEvent.setup()
      renderLogin()

      await user.click(
        screen.getByRole('button', { name: /continue without an account/i })
      )

      expect(mockNavigate).toHaveBeenCalledWith('/home')
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      renderLogin()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('email input has correct id for label association', () => {
      renderLogin()

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('id', 'email')
    })

    it('password input has correct id for label association', () => {
      renderLogin()

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('id', 'password')
    })

    it('Google sign in button has accessible name from visible text', () => {
      renderLogin()

      expect(
        screen.getByRole('button', { name: /continue with google/i })
      ).toBeInTheDocument()
    })

    it('email input has autocomplete attribute', () => {
      renderLogin()

      expect(screen.getByLabelText(/email/i)).toHaveAttribute(
        'autocomplete',
        'email'
      )
    })

    it('password input has current-password autocomplete in login mode', () => {
      renderLogin()

      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        'autocomplete',
        'current-password'
      )
    })

    it('password input has new-password autocomplete in sign up mode', async () => {
      const user = userEvent.setup()
      renderLogin()

      await user.click(screen.getByRole('button', { name: /^sign up$/i }))

      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        'autocomplete',
        'new-password'
      )
    })

    it('inputs have name attributes for form autofill', () => {
      renderLogin()

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('name', 'email')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        'name',
        'password'
      )
    })
  })

  describe('Google OAuth', () => {
    it('renders Google sign in button', () => {
      renderLogin()

      expect(
        screen.getByRole('button', { name: /continue with google/i })
      ).toBeInTheDocument()
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    })

    it('calls signInWithOAuth when clicking Google button', async () => {
      mockAuthSignInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://google.com/oauth' },
        error: null,
      })

      const user = userEvent.setup()
      renderLogin()

      await user.click(
        screen.getByRole('button', { name: /continue with google/i })
      )

      expect(mockAuthSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('home'),
        },
      })
    })

    it('shows error message on Google OAuth failure', async () => {
      mockAuthSignInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error: createMockAuthError('OAuth provider not configured'),
      })

      const user = userEvent.setup()
      renderLogin()

      await user.click(
        screen.getByRole('button', { name: /continue with google/i })
      )

      await waitFor(() => {
        expect(
          screen.getByText('OAuth provider not configured')
        ).toBeInTheDocument()
      })
    })

    it('disables Google button while loading', async () => {
      let resolvePromise: (value: unknown) => void
      mockAuthSignInWithOAuth.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const user = userEvent.setup()
      renderLogin()

      await user.click(
        screen.getByRole('button', { name: /continue with google/i })
      )

      expect(
        screen.getByRole('button', { name: /continue with google/i })
      ).toBeDisabled()

      await act(async () => {
        resolvePromise!({
          data: { provider: null, url: null },
          error: null,
        })
      })
    })

    it('clears previous success message when clicking Google sign in', async () => {
      // First, simulate a successful login that shows a message
      const mockUser = createMockUser({ id: '123' })
      mockAuthSignInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: createMockSession(mockUser),
        },
        error: null,
      })

      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      await waitFor(() => {
        expect(screen.getByText('Login successful!')).toBeInTheDocument()
      })

      // Now click Google sign in - it should clear the success message
      mockAuthSignInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error: createMockAuthError('OAuth error'),
      })

      await user.click(
        screen.getByRole('button', { name: /continue with google/i })
      )

      await waitFor(() => {
        // Success message should be cleared
        expect(screen.queryByText('Login successful!')).not.toBeInTheDocument()
        // Error message should be shown
        expect(screen.getByText('OAuth error')).toBeInTheDocument()
      })
    })
  })
})
