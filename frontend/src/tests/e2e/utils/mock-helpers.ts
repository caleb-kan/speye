import type { Page } from '@playwright/test'
import { mockAuthSession } from './utils'
import { pendingApprovals } from './mocks'

/**
 * Sets up a complete mock admin auth session.
 * Delegates to the shared mockAuthSession with admin-specific options.
 */
export async function mockAdminAuthSession(page: Page) {
  await mockAuthSession(page, {
    sub: 'admin-1',
    email: 'admin@example.com',
    userMetadata: { username: 'admin', role: 'admin' },
  })
}

/**
 * Mocks library text endpoints. Dispatches by HTTP method.
 */
export async function mockLibraryTexts(page: Page, texts: object[]) {
  await page.route('**/rest/v1/texts**', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      const count = texts.length
      const range = count === 0 ? '*/0' : `0-${count - 1}/${count}`
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(texts),
        headers: { 'content-range': range },
      })
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 204,
        contentType: 'application/json',
        body: '',
      })
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-text-1',
          title: 'Uploaded Text',
          processing_status: 'pending',
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    }
  })
}

/**
 * Mocks admin-specific endpoints: stats RPCs, pending texts query,
 * and action RPCs.
 *
 * The AdminStats type uses camelCase keys.
 * The RPC returns the object directly (not an array).
 * getPendingAdminReviews queries .from('texts').select(...).eq('admin_decision', 'pending')
 */
export async function mockAdminEndpoints(page: Page) {
  await page.route('**/rest/v1/rpc/get_admin_stats**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalTexts: 42,
        publicTexts: 18,
        privateTexts: 24,
        pendingTexts: pendingApprovals.length,
        activeUsers: 15,
        rejectionRate: '12.5%',
      }),
    })
  })

  await page.route('**/rest/v1/rpc/get_active_users_trend**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { activity_date: '2025-02-01', active_count: 10 },
        { activity_date: '2025-02-08', active_count: 12 },
        { activity_date: '2025-02-15', active_count: 15 },
      ]),
    })
  })

  const approvalResponses = pendingApprovals.map((a) => ({
    ...a,
    users: a.owner_username ? { username: a.owner_username } : null,
  }))
  const count = approvalResponses.length
  const range = count === 0 ? '*/0' : `0-${count - 1}/${count}`

  await page.route('**/rest/v1/texts**', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(approvalResponses),
        headers: { 'content-range': range },
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    }
  })

  await page.route('**/rest/v1/rpc/admin_approve_text**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route('**/rest/v1/rpc/admin_reject_text**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route(
    '**/rest/v1/rpc/admin_delete_tos_violation**',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    }
  )

  await page.route('**/rest/v1/rpc/admin_regenerate_quiz**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route('**/rest/v1/rpc/retry_text_processing**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route('**/rest/v1/notifications**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
  })
}

/**
 * Aborts realtime WebSocket connections to prevent retry loops in tests.
 */
export async function mockRealtimeSubscription(page: Page) {
  await page.route('**/realtime/v1/**', async (route) => {
    await route.abort()
  })
}
