import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'
import {
  mockLibraryTexts,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'
import { libraryTexts } from '../utils/mocks'

test.describe('Library Features', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockLibraryTexts(page, libraryTexts)
  })

  test('filters and searches texts', async ({ page }) => {
    await page.goto('/library')

    // Check search input and controls
    await expect(
      page.getByPlaceholder('Search texts by title or content...')
    ).toBeVisible()
    await expect(page.getByText('Show Filters')).toBeVisible()
    await expect(page.getByText('Sort by:')).toBeVisible()

    // Test search
    await expect(page.getByText('The Great Adventure')).toBeVisible()
    await page
      .getByPlaceholder('Search texts by title or content...')
      .fill('Adventure')
    await expect(page.getByText(/Found \d+ text/)).toBeVisible()
    await expect(page.getByText('The Great Adventure')).toBeVisible()

    // Clear search and toggle filters
    await page.getByPlaceholder('Search texts by title or content...').clear()
    await page.getByText('Show Filters').click()
    await expect(
      page.getByRole('button', { name: 'Fiction', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Non-Fiction' })
    ).toBeVisible()

    // Apply genre filter
    await page.getByRole('button', { name: 'Fiction', exact: true }).click()
    await expect(page.getByText('The Great Adventure')).toBeVisible()
  })

  test('uploads text using modal form', async ({ page }) => {
    await page.goto('/library')

    // Open modal
    await page.getByRole('button', { name: /upload text/i }).click()
    await expect(page.getByText(/upload text/i).first()).toBeVisible()
    await expect(page.getByLabel(/title/i)).toBeVisible()

    // Check submit button is disabled when empty
    const submitButton = page
      .getByRole('button', { name: /upload text/i })
      .last()
    await expect(submitButton).toBeDisabled()

    // Fill form and submit
    await page.getByLabel(/title/i).fill('My New Text')
    const contentArea = page.locator('textarea').first()
    await contentArea.fill(
      'This is the content of my new text. It needs to be long enough to pass validation.'
    )
    await submitButton.click()

    // Modal should close after successful upload
    await expect(page.getByLabel(/title/i)).not.toBeVisible({
      timeout: 5000,
    })
  })
})
