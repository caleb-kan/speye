import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { AuthProvider } from '../context/AuthProvider'
import { useAuth } from '../hooks/useAuth'
import * as supabaseModule from '../lib/supabase'
import '@testing-library/jest-dom'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

const mockSupabase = vi.mocked(supabaseModule.supabase)

describe('AuthProvider', () => {
  let authStateCallback: ((event: string, session: unknown) => void) | null =
    null

  beforeEach(() => {
    vi.clearAllMocks()
    authStateCallback = null

    // Default mock for getSession
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    // Capture the auth state change callback
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      } as never
    })
  })

  describe('Initial State', () => {
    it('starts with loading true', async () => {
      let loadingValue: boolean | undefined

      // Don't resolve getSession immediately to test loading state
      mockSupabase.auth.getSession.mockImplementation(
        () => new Promise(() => {})
      )

      render(
        <AuthProvider>
          <TestConsumer
            onRender={(auth) => {
              loadingValue = auth.loading
            }}
          />
        </AuthProvider>
      )

      expect(loadingValue).toBe(true)
    })

    it('sets loading to false after session fetch', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      render(
        <AuthProvider>
          <TestConsumer onRender={() => {}} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })
    })

    it('sets user and session when logged in', async () => {
      const mockSession = {
        access_token: 'token',
        user: { id: '123', email: 'test@example.com' },
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      render(
        <AuthProvider>
          <TestConsumer onRender={() => {}} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('123')
      })
    })

    it('user is null when not logged in', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      render(
        <AuthProvider>
          <TestConsumer onRender={() => {}} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })
    })
  })

  describe('Auth State Changes', () => {
    it('subscribes to auth state changes on mount', async () => {
      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
      })
    })

    it('updates user when auth state changes', async () => {
      render(
        <AuthProvider>
          <TestConsumer onRender={() => {}} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })

      // Simulate login
      act(() => {
        authStateCallback?.('SIGNED_IN', {
          access_token: 'token',
          user: { id: '456', email: 'new@example.com' },
        })
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('456')
      })
    })

    it('clears user on sign out event', async () => {
      const mockSession = {
        access_token: 'token',
        user: { id: '123', email: 'test@example.com' },
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      render(
        <AuthProvider>
          <TestConsumer onRender={() => {}} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('123')
      })

      // Simulate sign out
      act(() => {
        authStateCallback?.('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })
    })

    it('unsubscribes from auth changes on unmount', async () => {
      const unsubscribeMock = vi.fn()
      mockSupabase.auth.onAuthStateChange.mockImplementation(() => ({
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      }))

      const { unmount } = render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      )

      unmount()

      expect(unsubscribeMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Sign Out', () => {
    it('calls supabase signOut', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      const mockSession = {
        access_token: 'token',
        user: { id: '123', email: 'test@example.com' },
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      let signOutFn: (() => Promise<void>) | undefined

      render(
        <AuthProvider>
          <TestConsumer
            onRender={(auth) => {
              signOutFn = auth.signOut
            }}
          />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(signOutFn).toBeDefined()
      })

      await act(async () => {
        await signOutFn!()
      })

      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1)
    })
  })
})

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    mockSupabase.auth.onAuthStateChange.mockImplementation(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    }))
  })

  it('throws error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })

  it('returns auth context when used within AuthProvider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(typeof result.current.signOut).toBe('function')
  })

  it('provides updated user after login', async () => {
    let authStateCallback: ((event: string, session: unknown) => void) | null =
      null

    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      } as never
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()

    // Simulate login
    act(() => {
      authStateCallback?.('SIGNED_IN', {
        access_token: 'token',
        user: { id: '789', email: 'hook@example.com' },
      })
    })

    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: '789',
        email: 'hook@example.com',
      })
    })
  })
})

// Test helper component to access auth context
interface AuthContextType {
  user: { id: string } | null
  session: unknown
  loading: boolean
  signOut: () => Promise<void>
}

function TestConsumer({
  onRender,
}: {
  onRender: (auth: AuthContextType) => void
}) {
  const auth = useAuth()
  onRender(auth as AuthContextType)

  return (
    <div>
      <span data-testid="user">{auth.user?.id ?? 'null'}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
    </div>
  )
}
