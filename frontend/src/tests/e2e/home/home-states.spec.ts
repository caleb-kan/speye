import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'

test.describe('Home Page States', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
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

    await expect(page.getByText(/loading/i)).toBeVisible()
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

  test('retries fetch on retry click', async ({ page }) => {
    let callCount = 0
    await page.route('**/rest/v1/rpc/get_random_text**', async (route) => {
      callCount++
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'text-1',
              title: 'Recovered Text',
              content: 'We recovered from the error.',
              fiction: false,
              complexity: 4,
              processing_status: 'completed',
            },
          ]),
        })
      }
    })
    await page.goto('/home')

    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
    await page.getByRole('button', { name: /try again/i }).click()
    await expect(page.getByText('Recovered Text')).toBeVisible()
  })
})
