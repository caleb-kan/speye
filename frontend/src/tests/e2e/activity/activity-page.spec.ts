import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'

async function mockActivityData(page: Page, sessions: object[]) {
  await page.route('**/rest/v1/user_activity**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessions),
      })
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    }
  })
}

const mockSessions = [
  {
    id: 'session-1',
    text_id: 'text-1',
    wpm: 250,
    mode: 'standard',
    score: 80,
    start_time: '2025-03-10T10:00:00Z',
    end_time: '2025-03-10T10:02:00Z',
    progress_index: 100,
    text: {
      title: 'The Great Adventure',
      fiction: true,
      complexity: 3,
    },
  },
  {
    id: 'session-2',
    text_id: 'text-2',
    wpm: 300,
    mode: 'standard',
    score: 90,
    start_time: '2025-03-10T14:00:00Z',
    end_time: '2025-03-10T14:03:00Z',
    progress_index: 200,
    text: {
      title: 'Understanding AI',
      fiction: false,
      complexity: 7,
    },
  },
  {
    id: 'session-3',
    text_id: 'text-3',
    wpm: 200,
    mode: 'standard',
    score: 70,
    start_time: '2025-03-09T09:30:00Z',
    end_time: '2025-03-09T09:31:30Z',
    progress_index: 50,
    text: {
      title: 'Short Story Collection',
      fiction: true,
      complexity: 2,
    },
  },
]

test.describe('Activity Page', () => {
  test('displays Activity heading', async ({ page }) => {
    await mockAuthSession(page)
    await mockActivityData(page, mockSessions)
    await page.goto('/activity')

    await expect(page.getByRole('heading', { name: /activity/i })).toBeVisible()
  })

  test('shows stats grid with key metrics', async ({ page }) => {
    await mockAuthSession(page)
    await mockActivityData(page, mockSessions)
    await page.goto('/activity')

    await expect(page.getByText(/avg speed/i)).toBeVisible()
    await expect(page.getByText(/avg score/i)).toBeVisible()
    await expect(page.getByText(/texts read/i)).toBeVisible()
    await expect(page.getByText(/current streak/i)).toBeVisible()
  })

  test('shows skeleton loading state', async ({ page }) => {
    await mockAuthSession(page)
    await page.route('**/rest/v1/user_activity**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.goto('/activity')

    await expect(page.locator('.animate-pulse').first()).toBeVisible()
  })

  test('shows error state on API failure', async ({ page }) => {
    await mockAuthSession(page)
    await page.route('**/rest/v1/user_activity**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      })
    })
    await page.goto('/activity')

    await expect(page.getByText(/failed to load activity/i)).toBeVisible()
  })

  test('shows empty state when no sessions', async ({ page }) => {
    await mockAuthSession(page)
    await mockActivityData(page, [])
    await page.goto('/activity')

    await expect(page.getByRole('heading', { name: /activity/i })).toBeVisible()
  })
})
