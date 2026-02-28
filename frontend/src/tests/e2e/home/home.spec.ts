import { test, expect } from '@playwright/test'
import { mockAuthSession, mockRandomText } from '../utils/utils'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
  })

  test('displays text content with controls and progress', async ({ page }) => {
    await mockRandomText(page, {
      title: 'My Test Title',
      content: 'This is the body of the reading passage for testing.',
    })
    await page.goto('/home')

    await expect(page.getByText('My Test Title')).toBeVisible()
    await expect(
      page.getByText('This is the body of the reading passage for testing.')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New text' })).toBeVisible()
    await expect(page.getByText(/\d+\s*\/\s*\d+\s*words/i)).toBeVisible()
  })

  test('shows loading state while fetching', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_random_text**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'text-1',
            title: 'Delayed Text',
            content: 'Content here.',
            fiction: false,
            complexity: 4,
            processing_status: 'completed',
          },
        ]),
      })
    })
    await page.goto('/home')

    // Check for skeleton loaders (elements with animate-pulse class)
    await expect(page.locator('[class*="animate-pulse"]').first()).toBeVisible()
  })

  test('shows error with retry button on failure', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_random_text**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      })
    })
    await page.goto('/home')

    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
  })

  test('shows empty state when no texts available', async ({ page }) => {
    // Unroute the mockAuthSession catch-all so this specific route is reached
    await page.unroute('**/rest/v1/**')
    await page.route('**/rest/v1/**', async (route) => {
      if (route.request().url().includes('/rpc/get_random_text')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })
    await page.goto('/home')

    await expect(page.getByText(/no texts available/i)).toBeVisible()
  })

  test('loads new text on New text button click', async ({ page }) => {
    await mockRandomText(page, { title: 'First Text' })
    await page.goto('/home')

    await expect(page.getByText('First Text')).toBeVisible()

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockRandomText(page, { title: 'Second Text' })

    await page.getByRole('button', { name: 'New text' }).click()
    await expect(page.getByText('Second Text')).toBeVisible()
  })
})
