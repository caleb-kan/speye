import { test, expect } from '@playwright/test'
import {
  mockAdminAuthSession,
  mockAdminEndpoints,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'
import { mockAuthSession } from '../utils/utils'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAuthSession(page)
    await mockAdminEndpoints(page)
    await mockRealtimeSubscription(page)
  })

  test('shows stats cards for admin users', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText(/admin panel/i)).toBeVisible()
    await expect(page.getByText(/total texts/i)).toBeVisible()
    await expect(page.getByText('42')).toBeVisible()
    await expect(page.getByText(/rejection rate/i)).toBeVisible()
    await expect(page.getByText('12.5%')).toBeVisible()
  })

  test('shows empty approval state when no pending texts', async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAdminAuthSession(page)
    await mockRealtimeSubscription(page)

    await page.route('**/rest/v1/rpc/get_admin_stats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalTexts: 10,
          publicTexts: 5,
          privateTexts: 5,
          pendingTexts: 0,
          activeUsers: 3,
          rejectionRate: '0%',
        }),
      })
    })
    await page.route(
      '**/rest/v1/rpc/get_active_users_trend**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    )
    await page.route('**/rest/v1/texts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '*/0' },
      })
    })
    await page.route('**/rest/v1/notifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto('/admin')

    await expect(page.getByText(/admin panel/i)).toBeVisible()
    await expect(page.getByText('10')).toBeVisible()
  })

  test('shows access denied for non-admin users', async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await page.goto('/admin')

    await expect(
      page.getByText(/access denied|unauthorized|not authorized/i)
    ).toBeVisible()
  })

  test('displays active users count', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText(/active users/i).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: '15' })).toBeVisible()
  })
})
