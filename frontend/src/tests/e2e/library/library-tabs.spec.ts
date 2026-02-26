import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'
import {
  mockLibraryTexts,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'
import { libraryTexts } from '../utils/mocks'

test.describe('Library Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockLibraryTexts(page, libraryTexts)
  })

  test('displays Library heading and Private tab by default', async ({
    page,
  }) => {
    await page.goto('/library')

    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
    await expect(page.getByText('Your personal text library')).toBeVisible()
  })

  test('shows Upload button when authenticated', async ({ page }) => {
    await page.goto('/library')

    await expect(
      page.getByRole('button', { name: /upload text/i })
    ).toBeVisible()
  })

  test('switches to Public tab', async ({ page }) => {
    await page.goto('/library')

    await page.getByRole('button', { name: /public/i }).click()
    await expect(page.getByText(/browse public texts/i)).toBeVisible()
  })

  test('switches back to Private tab', async ({ page }) => {
    await page.goto('/library')

    await page.getByRole('button', { name: /public/i }).click()
    await page.getByRole('button', { name: /private/i }).click()
    await expect(page.getByText('Your personal text library')).toBeVisible()
  })

  test('shows loading state initially', async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await page.route('**/rest/v1/texts**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '*/0' },
      })
    })
    await page.goto('/library')

    // Check for skeleton loaders (elements with animate-pulse class)
    await expect(page.locator('[class*="animate-pulse"]').first()).toBeVisible()
  })

  test('shows empty state when no texts', async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await page.route('**/rest/v1/texts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '*/0' },
      })
    })
    await page.goto('/library')

    await expect(
      page.getByText(/your uploaded texts will appear here/i)
    ).toBeVisible()
  })

  test('displays text cards with title', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('The Great Adventure')).toBeVisible()
  })
})
