import type { Page } from '@playwright/test'

type MockTextOverrides = Partial<{
  id: string
  title: string | null
  content: string
  summary: string | null
  uploaded_at: string
  owner_id: string | null
  quiz: null
  fiction: boolean | null
  category: string | null
  complexity: number | null
  source: string | null
  processing_status: 'pending' | 'completed' | 'failed'
  quiz_valid: boolean | null
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
  category: null,
  complexity: 4,
  source: null,
  processing_status: 'completed' as const,
  quiz_valid: null,
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

  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'test-access-token',
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
          user_metadata: {},
          created_at: now,
          updated_at: now,
        },
      }),
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
