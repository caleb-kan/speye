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

  test('shows stats cards and active users for admin users', async ({
    page,
  }) => {
    await page.goto('/admin')

    await expect(page.getByText(/admin panel/i)).toBeVisible()
    await expect(page.getByText(/total texts/i)).toBeVisible()
    await expect(page.getByText('42')).toBeVisible()
    await expect(page.getByText(/rejection rate/i)).toBeVisible()
    await expect(page.getByText('12.5%')).toBeVisible()
    await expect(page.getByText(/active users/i).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: '15' })).toBeVisible()
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
})
