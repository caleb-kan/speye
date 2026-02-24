import { test, expect } from '@playwright/test'
import {
  mockAdminAuthSession,
  mockAdminEndpoints,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'

test.describe('Admin Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockAdminEndpoints(page)
  })

  test('shows flagged text with TOS violation label', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText('Suspicious Content')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/tos violation/i)).toBeVisible()
  })

  test('shows delete button for TOS violations', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByText('Suspicious Content')).toBeVisible({
      timeout: 10000,
    })

    const deleteButton = page.getByRole('button', { name: /delete/i }).first()
    await expect(deleteButton).toBeVisible()
  })

  test('shows approve button for passed texts', async ({ page }) => {
    await page.goto('/admin')

    await page.getByRole('button', { name: /passed/i }).click()
    await expect(page.getByText('Good Article')).toBeVisible({
      timeout: 10000,
    })

    const approveButton = page.getByRole('button', { name: /approve/i }).first()
    await expect(approveButton).toBeVisible()
  })

  test('shows reject button for passed texts', async ({ page }) => {
    await page.goto('/admin')

    await page.getByRole('button', { name: /passed/i }).click()
    await expect(page.getByText('Good Article')).toBeVisible({
      timeout: 10000,
    })

    const rejectButton = page.getByRole('button', { name: /reject/i }).first()
    await expect(rejectButton).toBeVisible()
  })

  test('sends approve RPC when approving text', async ({ page }) => {
    await page.goto('/admin')

    await page.getByRole('button', { name: /passed/i }).click()
    await expect(page.getByText('Good Article')).toBeVisible({
      timeout: 10000,
    })

    const rpcRequest = page.waitForRequest((req) =>
      req.url().includes('admin_approve_text')
    )
    await page
      .getByRole('button', { name: /approve/i })
      .first()
      .click()
    const req = await rpcRequest
    expect(req.url()).toContain('admin_approve_text')
  })
})
