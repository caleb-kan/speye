import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'

test.describe('Settings Page', () => {
  test('displays settings sections and legal links when authenticated', async ({
    page,
  }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(page.getByText(/^theme$/i)).toBeVisible()
    await expect(page.getByRole('radiogroup')).toBeVisible()
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible()
    await expect(page.getByText(/^about$/i)).toBeVisible()
    await expect(page.getByText(/offline cache/i)).toBeVisible()

    await expect(
      page.getByRole('link', { name: /terms of service/i })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /license/i })).toBeVisible()
  })

  test('does not show profile account actions when not authenticated', async ({
    page,
  }) => {
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /log out/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /log in/i })).toHaveCount(0)
    await expect(page.getByText(/offline cache/i)).toHaveCount(0)
  })
})

test.describe('Profile Page', () => {
  test('shows profile and account sections when authenticated', async ({
    page,
  }) => {
    await mockAuthSession(page)
    await page.goto('/profile')

    await expect(
      page.getByRole('heading', { name: /^profile$/i })
    ).toBeVisible()
    await expect(page.getByText(/@testuser/i)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /^account$/i })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
  })

  test('shows login prompt when not authenticated', async ({ page }) => {
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
    await page.goto('/profile')

    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /log out/i })).toHaveCount(0)
  })
})
