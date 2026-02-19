import type { Page } from '@playwright/test'

/**
 * Derives the Supabase auth storage key from the project URL, matching
 * the logic in @supabase/supabase-js: `sb-${hostname.split('.')[0]}-auth-token`
 */
function getSupabaseStorageKey(): string {
  const url = process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321'
  const hostname = new URL(url).hostname.split('.')[0]
  return `sb-${hostname}-auth-token`
}

/**
 * Builds a structurally valid JWT (header.payload.signature) that Supabase's
 * `decodeJWT` helper can parse. The signature is fake since the client never
 * verifies it, but the three-part base64url structure is required.
 */
export function createMockJWT(
  sub = 'user-1',
  email = 'reader@example.com',
  expiresInSeconds = 3600
): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'supabase',
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    email,
    user_metadata: { username: 'testuser' },
  }

  const toBase64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const sig = Buffer.from('fake-sig')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${toBase64Url(header)}.${toBase64Url(payload)}.${sig}`
}

type MockTextOverrides = Partial<{
  id: string
  title: string | null
  content: string
  summary: string | null
  uploaded_at: string
  owner_id: string | null
  quiz: null
  fiction: boolean | null
  complexity: number | null
  source: string | null
  processing_status: 'pending' | 'completed' | 'failed'
  quiz_valid: boolean | null
  llm_decision: 'approved' | 'rejected' | null
  llm_violation_type: string | null
  admin_decision: 'approved' | 'rejected' | 'pending' | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null
  rejection_reason: string | null
  rejection_stage: 'process_text' | 'validate_quiz' | null
}>

export const defaultMockText = {
  id: 'text-1',
  title: 'Sample Reading Text',
  content: 'This is a short sample passage for end-to-end testing.',
  summary: null,
  uploaded_at: new Date().toISOString(),
  owner_id: null,
  quiz: null,
  fiction: false,
  complexity: 4,
  source: null,
  processing_status: 'completed' as const,
  quiz_valid: null,
  llm_decision: null,
  llm_violation_type: null,
  admin_decision: null,
  admin_reviewed_by: null,
  admin_reviewed_at: null,
  rejection_reason: null,
  rejection_stage: null,
}

export async function mockRandomText(
  page: Page,
  overrides: MockTextOverrides = {}
) {
  const mockText = { ...defaultMockText, ...overrides }

  await page.route('**/rest/v1/rpc/get_random_text**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([mockText]),
    })
  })
}

export async function mockAuthTokenSuccess(
  page: Page,
  email = 'reader@example.com'
) {
  const now = new Date().toISOString()
  const jwt = createMockJWT('user-1', email)

  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: jwt,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        user: {
          id: 'user-1',
          aud: 'authenticated',
          role: 'authenticated',
          email,
          email_confirmed_at: now,
          app_metadata: {},
          user_metadata: { username: 'testuser' },
          created_at: now,
          updated_at: now,
        },
      }),
    })
  })
}

/**
 * Sets up a complete mock auth session: seeds localStorage with a valid
 * session AND mocks all auth network endpoints as fallback. Must be
 * called before `page.goto()`.
 */
export async function mockAuthSession(
  page: Page,
  email = 'reader@example.com'
) {
  const now = new Date().toISOString()
  const jwt = createMockJWT('user-1', email)
  const storageKey = getSupabaseStorageKey()

  const mockUser = {
    id: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: now,
    app_metadata: {},
    user_metadata: { username: 'testuser' },
    created_at: now,
    updated_at: now,
  }

  // Seed localStorage so the Supabase client recovers the session on load
  await page.addInitScript(
    ({ token, key }: { token: string; key: string }) => {
      const session = {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'test-refresh-token',
        user: {
          id: 'user-1',
          email: 'reader@example.com',
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: { username: 'testuser' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }

      localStorage.setItem(key, JSON.stringify(session))
    },
    { token: jwt, key: storageKey }
  )

  // Mock token endpoint (handles refresh and grant requests)
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: jwt,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        user: mockUser,
      }),
    })
  })

  // Mock user endpoint (validates the session server-side)
  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    })
  })
}

export async function mockAuthTokenError(
  page: Page,
  message = 'Invalid login credentials'
) {
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: message,
      }),
    })
  })
}
