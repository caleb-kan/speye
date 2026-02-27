import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'

test.describe('Complete Profile', () => {
  test('displays form with validation hints and handles duplicate username error', async ({
    page,
  }) => {
    await mockAuthSession(page, {
      sub: 'user-no-username',
      email: 'oauth@example.com',
      userMetadata: {},
    })

    await page.route('**/rest/v1/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'existing-user' }),
      })
    })

    await page.goto('/complete-profile')

    await expect(page.getByText(/complete your profile/i)).toBeVisible()
    await expect(page.getByLabel(/username/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /save username/i })
    ).toBeVisible()
    await expect(page.getByText(/3 to 20 characters/i)).toBeVisible()

    await page.getByLabel(/username/i).fill('takenuser')
    await page.getByRole('button', { name: /save username/i }).click()

    await expect(page.getByRole('alert')).toBeVisible({
      timeout: 5000,
    })
  })

  test('redirects to /home on success', async ({ page }) => {
    await mockAuthSession(page, {
      sub: 'user-no-username',
      email: 'oauth@example.com',
      userMetadata: {},
    })

    await page.route('**/rest/v1/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      })
    })

    // Override the user endpoint to handle PUT (username update)
    await page.route('**/auth/v1/user**', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'user-no-username',
              email: 'oauth@example.com',
              user_metadata: { username: 'newusername' },
            },
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-no-username',
            email: 'oauth@example.com',
            user_metadata: {},
          }),
        })
      }
    })

    await page.route('**/rest/v1/rpc/get_random_text**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'text-1',
            title: 'Welcome Text',
            content: 'Welcome to the app.',
            fiction: false,
            complexity: 4,
            processing_status: 'completed',
          },
        ]),
      })
    })

    await page.goto('/complete-profile')
    await page.getByLabel(/username/i).fill('newusername')
    await page.getByRole('button', { name: /save username/i }).click()

    await page.waitForURL('**/home**', { timeout: 15000 })
  })
})
