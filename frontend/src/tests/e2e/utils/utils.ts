import type { Page } from '@playwright/test'

/**
 * Derives the Supabase auth storage key from the project URL, matching
 * the logic in @supabase/supabase-js: `sb-${hostname.split('.')[0]}-auth-token`
 */
export function getSupabaseStorageKey(): string {
  const url = process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321'
  const hostname = new URL(url).hostname.split('.')[0]
  return `sb-${hostname}-auth-token`
}

/** Encodes an object as a base64url string (no padding). */
export function toBase64Url(obj: object): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const FAKE_SIGNATURE = Buffer.from('fake-sig')
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')

const SESSION_EXPIRY_SECONDS = 3600

/**
 * Builds a structurally valid JWT (header.payload.signature) that Supabase's
 * `decodeJWT` helper can parse. The signature is fake since the client never
 * verifies it, but the three-part base64url structure is required.
 */
export function createMockJWT(
  sub = 'user-1',
  email = 'reader@example.com',
  userMetadata: Record<string, string> = { username: 'testuser' }
): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'supabase',
    exp: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS,
    email,
    user_metadata: userMetadata,
  }

  return `${toBase64Url(header)}.${toBase64Url(payload)}.${FAKE_SIGNATURE}`
}

interface MockTextOverrides {
  id?: string
  title?: string | null
  content?: string
  summary?: string | null
  uploaded_at?: string
  owner_id?: string | null
  quiz?: object | null
  fiction?: boolean | null
  complexity?: number | null
  source?: string | null
  processing_status?: 'pending' | 'completed' | 'failed'
  quiz_valid?: boolean | null
  llm_decision?: 'approved' | 'rejected' | null
  llm_violation_type?: string | null
  admin_decision?: 'approved' | 'rejected' | 'pending' | null
  admin_reviewed_by?: string | null
  admin_reviewed_at?: string | null
  rejection_reason?: string | null
  rejection_stage?: 'process_text' | 'validate_quiz' | null
}

export const defaultMockText = {
  id: 'text-1',
  title: 'Sample Reading Text',
  content: 'This is a short sample passage for end-to-end testing.',
  summary: null,
  uploaded_at: new Date().toISOString(),
  owner_id: null,
  quiz: null,
  fiction: false,
  complexity: 10,
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

  // Same navigator.onLine override as mockAuthSession — needed so the home
  // page (navigated to after login) doesn't enter offline-cache mode in CI.
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'onLine', {
        get: () => true,
        configurable: true,
      })
    } catch {
      // ignore
    }
    localStorage.removeItem('speye-force-offline')
  })

  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: jwt,
        token_type: 'bearer',
        expires_in: SESSION_EXPIRY_SECONDS,
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

  // Catch-all for REST requests so the home page (navigated to after login)
  // doesn't hang on unmocked Supabase endpoints in CI.
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}

export interface MockSessionOptions {
  sub?: string
  email?: string
  userMetadata?: Record<string, string>
}

/**
 * Sets up a complete mock auth session: seeds localStorage with a valid
 * session AND mocks all auth network endpoints as fallback. Must be
 * called before `page.goto()`.
 */
export async function mockAuthSession(
  page: Page,
  options: MockSessionOptions = {}
) {
  const {
    sub = 'user-1',
    email = 'reader@example.com',
    userMetadata = { username: 'testuser' },
  } = options
  const now = new Date().toISOString()
  const jwt = createMockJWT(sub, email, userMetadata)
  const storageKey = getSupabaseStorageKey()

  const mockUser = {
    id: sub,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: now,
    app_metadata: {},
    user_metadata: userMetadata,
    created_at: now,
    updated_at: now,
  }

  // Seed localStorage so the Supabase client recovers the session on load
  // and clear offline cache so stale IndexedDB data doesn't interfere with mocked routes
  await page.addInitScript(
    async ({
      token,
      key,
      user,
    }: {
      token: string
      key: string
      user: object
    }) => {
      // Synchronous overrides FIRST — addInitScript async functions do NOT
      // block page script execution, so navigator.onLine and localStorage must
      // be set up before any await or the app may start with onLine=false and
      // bypass mocked network routes (going straight to the offline cache).
      try {
        Object.defineProperty(navigator, 'onLine', {
          get: () => true,
          configurable: true,
        })
      } catch {
        // Property may not be configurable in all environments — safe to ignore
      }
      localStorage.removeItem('speye-force-offline')

      const session = {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'test-refresh-token',
        user,
      }

      localStorage.setItem(key, JSON.stringify(session))

      // Async IDB cleanup after the sync setup above. The page scripts will
      // already see the correct navigator.onLine and session values by the
      // time they run, regardless of how long this deletion takes.
      // Use open+clear instead of deleteDatabase: in WebKit, deleteDatabase
      // fires onblocked when connections from a previous test (same browser
      // context) are still alive, and a subsequent open() queues behind the
      // pending deletion, creating a deadlock that hangs IDB operations.
      await new Promise<void>((resolve) => {
        const storeNames = [
          'texts',
          'library',
          'activity',
          'metadata',
          'notifications',
        ]
        const openReq = indexedDB.open('speye-offline')
        openReq.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const toClear = storeNames.filter((s) =>
            db.objectStoreNames.contains(s)
          )
          if (toClear.length === 0) {
            db.close()
            resolve()
            return
          }
          const tx = db.transaction(toClear, 'readwrite')
          toClear.forEach((s) => tx.objectStore(s).clear())
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            resolve()
          }
          tx.onabort = () => {
            db.close()
            resolve()
          }
        }
        openReq.onerror = () => resolve()
        openReq.onblocked = () => resolve()
      }).catch(() => {
        // Ignore errors — the test can continue without a clean slate
      })
    },
    { token: jwt, key: storageKey, user: mockUser }
  )

  // Mock token endpoint (handles refresh and grant requests)
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: jwt,
        token_type: 'bearer',
        expires_in: SESSION_EXPIRY_SECONDS,
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

  // Catch-all for any other Supabase REST requests (e.g. user_activity,
  // texts table queries from prefetch) so they resolve instantly instead of
  // hanging on a connection to a non-running Supabase server.
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
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

/**
 * Simulates going offline or online in a cross-browser-reliable way.
 *
 * `page.context().setOffline()` alone is not sufficient because:
 *  1. It fires the 'offline' DOM event at the browser level, which may arrive
 *     before React's useEffect has registered its window event listener
 *     (race condition — non-deterministic test failures).
 *  2. In WebKit, navigator.onLine may not be updated by setOffline() when the
 *     property has been overridden via Object.defineProperty in an init script.
 *
 * This helper blocks/unblocks the network AND then uses page.evaluate() to:
 *  - Update navigator.onLine synchronously in the page context.
 *  - Re-dispatch the 'offline'/'online' event so any already-registered
 *    listeners (React's NetworkStatusProvider) receive it reliably.
 */
export async function setPageOffline(
  page: Page,
  offline: boolean
): Promise<void> {
  await page.context().setOffline(offline)
  await page.evaluate((isOffline: boolean) => {
    try {
      Object.defineProperty(navigator, 'onLine', {
        get: () => !isOffline,
        configurable: true,
      })
    } catch {
      // ignore if not configurable
    }
    window.dispatchEvent(new Event(isOffline ? 'offline' : 'online'))
  }, offline)
}
