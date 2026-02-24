import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'

test.describe('Settings Page', () => {
  test('displays settings heading', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(page.getByText(/settings/i).first()).toBeVisible()
  })

  test('shows profile section with username when authenticated', async ({
    page,
  }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(page.getByText(/profile/i).first()).toBeVisible()
    await expect(page.getByText(/@testuser/i)).toBeVisible()
  })

  test('shows theme selector', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(page.getByText(/theme/i).first()).toBeVisible()
    await expect(page.getByRole('radiogroup')).toBeVisible()
  })

  test('shows keyboard shortcuts section', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(page.getByText(/shortcuts/i)).toBeVisible()
  })

  test('shows about section', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(page.getByText(/about/i).first()).toBeVisible()
  })

  test('shows sign out button when authenticated', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
  })

  test('shows login prompt when not authenticated', async ({ page }) => {
    // Mock auth endpoints to return 401 for unauthenticated state
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
    await page.goto('/settings')

    const logoutButton = page.getByRole('button', {
      name: /log out/i,
    })
    await expect(logoutButton).not.toBeVisible()
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
  })
})
