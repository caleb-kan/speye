import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'
import {
  mockLibraryTexts,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'
import { libraryTexts } from '../utils/mocks'

test.describe('Library Text Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockLibraryTexts(page, libraryTexts)
  })

  test('shows text cards with titles', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('The Great Adventure')).toBeVisible()
  })

  test('shows delete button on user-owned texts', async ({ page }) => {
    await page.goto('/library')
    await expect(page.getByText('The Great Adventure')).toBeVisible()

    await expect(
      page.getByRole('button', { name: /delete/i }).first()
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

  test('shows failed processing texts', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('Failed Processing Text')).toBeVisible()
  })
})
