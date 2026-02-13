import { vi } from 'vitest'
import type {
  User,
  Session,
  AuthError,
  AuthResponse,
} from '@supabase/supabase-js'

/**
 * Creates a mock Supabase User object for testing
 */
export const createMockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }) as User

/**
 * Creates a mock Supabase Session object for testing
 */
export const createMockSession = (
  user: User,
  overrides: Partial<Session> = {}
): Session =>
  ({
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user,
    ...overrides,
  }) as Session

/**
 * Creates a mock auth context value for testing
 */
export const createMockAuthContext = (user: User | null = null) => ({
  user,
  session: user ? createMockSession(user) : null,
  loading: false,
  signOut: vi.fn(),
})

/**
 * Creates mock question sets for quiz testing
 */
export const createMockQuestionSets = (setCount = 5, questionsPerSet = 5) => {
  return Array.from({ length: setCount }, (_, setIndex) => ({
    questions: Array.from({ length: questionsPerSet }, (_, qIndex) => ({
      question: `Question ${setIndex * questionsPerSet + qIndex + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: qIndex % 4,
    })),
  }))
}

/**
 * Creates a mock Supabase AuthError object for testing
 */
export const createMockAuthError = (
  message: string,
  overrides: Partial<AuthError> = {}
): AuthError => ({
  name: 'AuthApiError',
  message,
  status: 400,
  __isAuthError: true,
  ...overrides,
})

/**
 * Creates a mock auth state change subscription for testing
 */
export const createMockAuthSubscription = (unsubscribe = vi.fn()) => ({
  data: {
    subscription: {
      id: 'mock-subscription-id',
      callback: vi.fn(),
      unsubscribe,
    },
  },
})

/**
 * Creates a mock response for the getSession method
 */
export function mockSessionResponse(
  session: Session | null,
  user: User | null = session?.user ?? null
) {
  if (session && user) {
    return {
      data: { session, user },
      error: null,
    } satisfies AuthResponse
  }

  return {
    data: { session: null, user: null },
    error: null,
  } satisfies AuthResponse
}
