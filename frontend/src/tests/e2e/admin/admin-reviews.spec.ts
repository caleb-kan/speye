import { test, expect } from '@playwright/test'
import {
  mockAdminAuthSession,
  mockAdminEndpoints,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'

test.describe('Admin Reviews', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockAdminEndpoints(page)
  })

  test('displays review section with tabs and badge', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText(/pending reviews/i)).toBeVisible()
    await expect(page.getByText(/flagged/i).first()).toBeVisible()
    await expect(page.getByText(/passed/i).first()).toBeVisible()
    await expect(page.getByText('2 Pending')).toBeVisible()
  })

  test('shows flagged texts with TOS violation and delete button', async ({
    page,
  }) => {
    await page.goto('/admin')

    await expect(page.getByText('Suspicious Content')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/tos violation/i)).toBeVisible()

    const deleteButton = page.getByRole('button', { name: /delete/i }).first()
    await expect(deleteButton).toBeVisible()
  })

  test('shows passed texts with approve and reject buttons', async ({
    page,
  }) => {
    await page.goto('/admin')

    await page.getByRole('button', { name: /passed/i }).click()

    await expect(page.getByText('Good Article')).toBeVisible({
      timeout: 10000,
    })

    const approveButton = page.getByRole('button', { name: /approve/i }).first()
    await expect(approveButton).toBeVisible()

    const rejectButton = page.getByRole('button', { name: /reject/i }).first()
    await expect(rejectButton).toBeVisible()
  })
})
