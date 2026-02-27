import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'
import {
  mockLibraryTexts,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'
import { libraryTexts } from '../utils/mocks'

test.describe('Library Display', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockLibraryTexts(page, libraryTexts)
  })

  test('displays library heading, upload button, and text cards', async ({
    page,
  }) => {
    await page.goto('/library')

    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
    await expect(page.getByText('Your personal text library')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /upload text/i })
    ).toBeVisible()
    await expect(page.getByText('The Great Adventure')).toBeVisible()
  })

  test('switches between Private and Public tabs', async ({ page }) => {
    await page.goto('/library')

    await page.getByRole('button', { name: /public/i }).click()
    await expect(page.getByText(/browse public texts/i)).toBeVisible()

    await page.getByRole('button', { name: /private/i }).click()
    await expect(page.getByText('Your personal text library')).toBeVisible()
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

  test('opens delete confirmation and can cancel', async ({ page }) => {
    await page.goto('/library')
    await expect(page.getByText('The Great Adventure')).toBeVisible()

    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click()

    await expect(page.getByText(/delete text/i)).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()

    await expect(page.getByText('The Great Adventure')).toBeVisible()
  })
})
