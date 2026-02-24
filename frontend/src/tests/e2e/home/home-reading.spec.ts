import { test, expect } from '@playwright/test'
import { mockAuthSession, mockRandomText } from '../utils/utils'

test.describe('Home Reading Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
  })

  test('displays text title and content when loaded', async ({ page }) => {
    await mockRandomText(page, {
      title: 'My Test Title',
      content: 'This is the body of the reading passage for testing.',
    })
    await page.goto('/home')

    await expect(page.getByText('My Test Title')).toBeVisible()
    await expect(
      page.getByText('This is the body of the reading passage for testing.')
    ).toBeVisible()
  })

  test('shows Play button and reading controls', async ({ page }) => {
    await mockRandomText(page)
    await page.goto('/home')

    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New text' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
  })

  test('shows error state with retry on API failure', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_random_text**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
        }),
      })
    })
    await page.goto('/home')

    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
  })

  test('shows empty state when no texts available', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_random_text**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
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
