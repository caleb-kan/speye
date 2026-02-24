import { test, expect } from '@playwright/test'

test.describe('Forgot Password', () => {
  test('displays form with email field', async ({ page }) => {
    await page.goto('/forgot-password')

    await expect(page.getByText(/reset password/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /send reset link/i })
    ).toBeVisible()
  })

  test('shows success message after submit', async ({ page }) => {
    await page.route('**/auth/v1/recover**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto('/forgot-password')

    await page.getByLabel(/email/i).fill('user@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()

    await expect(page.getByRole('status')).toBeVisible()
  })

  test('shows error on API failure', async ({ page }) => {
    await page.route('**/auth/v1/recover**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'server_error',
          error_description: 'Failed to send email',
        }),
      })
    })

    await page.goto('/forgot-password')

    await page.getByLabel(/email/i).fill('user@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('has back to login link', async ({ page }) => {
    await page.goto('/forgot-password')

    const backButton = page.getByRole('button', {
      name: /back to login/i,
    })
    await expect(backButton).toBeVisible()
  })
})
