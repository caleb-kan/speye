import { test, expect } from '@playwright/test'
import {
  mockAdminAuthSession,
  mockAdminEndpoints,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'

test.describe('Admin Approvals', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockAdminEndpoints(page)
  })

  test('displays Pending Reviews section', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText(/pending reviews/i)).toBeVisible()
  })

  test('shows flagged text in the Flagged tab', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText('Suspicious Content')).toBeVisible({
      timeout: 10000,
    })
  })

  test('shows filter tabs for flagged and passed texts', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText(/flagged/i).first()).toBeVisible()
    await expect(page.getByText(/passed/i).first()).toBeVisible()
  })

  test('shows pending count badge', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText('2 Pending')).toBeVisible()
  })

  test('shows passed texts when switching to Passed tab', async ({ page }) => {
    await page.goto('/admin')

    await page.getByRole('button', { name: /passed/i }).click()

    await expect(page.getByText('Good Article')).toBeVisible({
      timeout: 10000,
    })
  })
})
