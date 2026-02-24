import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'
import {
  mockLibraryTexts,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'
import { libraryTexts } from '../utils/mocks'

test.describe('Library Upload', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockLibraryTexts(page, libraryTexts)
  })

  test('opens upload modal on button click', async ({ page }) => {
    await page.goto('/library')

    await page.getByRole('button', { name: /upload text/i }).click()
    await expect(page.getByText(/upload text/i).first()).toBeVisible()
  })

  test('shows form fields in upload modal', async ({ page }) => {
    await page.goto('/library')

    await page.getByRole('button', { name: /upload text/i }).click()

    await expect(page.getByLabel(/title/i)).toBeVisible()
  })

  test('closes modal on cancel', async ({ page }) => {
    await page.goto('/library')

    await page.getByRole('button', { name: /upload text/i }).click()
    await expect(page.getByLabel(/title/i)).toBeVisible()

    await page
      .getByRole('button', { name: /cancel|close/i })
      .first()
      .click()

    await expect(page.getByLabel(/title/i)).not.toBeVisible()
  })

  test('submits text and closes on success', async ({ page }) => {
    await page.goto('/library')

    await page.getByRole('button', { name: /upload text/i }).click()

    await page.getByLabel(/title/i).fill('My New Text')
    const contentArea = page.locator('textarea').first()
    await contentArea.fill(
      'This is the content of my new text. It needs to be long enough to pass validation.'
    )

    const submitButton = page
      .getByRole('button', { name: /upload text/i })
      .last()
    await submitButton.click()

    // Modal should close after successful upload
    await expect(page.getByLabel(/title/i)).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('shows validation when content is empty', async ({ page }) => {
    await page.goto('/library')

    await page.getByRole('button', { name: /upload text/i }).click()

    const submitButton = page
      .getByRole('button', { name: /upload text/i })
      .last()
    await expect(submitButton).toBeDisabled()
  })
})
