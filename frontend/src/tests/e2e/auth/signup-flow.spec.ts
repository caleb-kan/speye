import { test, expect } from '@playwright/test'

test.describe('Sign Up Flow', () => {
  test('toggles between sign in and sign up modes', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()

    await page.getByRole('button', { name: 'Sign up' }).click()
    await expect(
      page.getByRole('button', { name: 'Create Account' })
    ).toBeVisible()

    await expect(page.getByLabel(/username/i)).toBeVisible()
  })

  test('shows validation error for existing username', async ({ page }) => {
    // Mock username availability check to return an existing user
    await page.route('**/rest/v1/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'existing-user' }),
      })
    })

    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign up' }).click()

    await page.getByLabel(/username/i).fill('existinguser')
    await page.getByLabel(/email/i).fill('existing@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByText(/username is already taken/i)).toBeVisible()
  })

  test('shows success message on valid sign up', async ({ page }) => {
    // Mock username as available (no existing user)
    await page.route('**/rest/v1/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      })
    })
    await page.route('**/auth/v1/signup**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-user-1',
          email: 'new@example.com',
          confirmation_sent_at: new Date().toISOString(),
        }),
      })
    })

    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign up' }).click()

    await page.getByLabel(/username/i).fill('newuser')
    await page.getByLabel(/email/i).fill('new@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByRole('status')).toBeVisible({
      timeout: 5000,
    })
  })

  test('displays Google OAuth button', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText(/continue with google/i)).toBeVisible()
  })

  test('shows error on failed sign up', async ({ page }) => {
    // Mock username as available so test reaches signup endpoint
    await page.route('**/rest/v1/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      })
    })
    await page.route('**/auth/v1/signup**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'server_error',
          error_description: 'An unexpected error occurred',
        }),
      })
    })

    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign up' }).click()

    await page.getByLabel(/username/i).fill('testuser')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })
})
