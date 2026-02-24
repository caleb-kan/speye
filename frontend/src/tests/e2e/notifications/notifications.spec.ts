import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'

test.describe('Notifications Page', () => {
  const mockNotifications = [
    {
      id: '1',
      user_id: 'user-1',
      message: 'Your quiz score is ready',
      type: 'info',
      seen: false,
      toast_shown: false,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
      link: '/activity',
    },
    {
      id: '2',
      user_id: 'user-1',
      message: 'New text added to library',
      type: 'info',
      seen: false,
      toast_shown: false,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
      link: null,
    },
    {
      id: '3',
      user_id: 'user-1',
      message: 'Reading session complete',
      type: 'alert',
      seen: true,
      toast_shown: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      link: '/library',
    },
    {
      id: '4',
      user_id: 'user-1',
      message: 'Account settings updated',
      type: 'info',
      seen: true,
      toast_shown: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      link: null,
    },
  ]

  test.beforeEach(async ({ page }) => {
    // Sets up localStorage session + mocks /auth/v1/token and /auth/v1/user
    await mockAuthSession(page)

    // Mock the notifications endpoint
    await page.route('**/rest/v1/notifications**', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], error: null }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockNotifications),
        })
      }
    })

    // Abort realtime WebSocket connections to prevent retry loops
    await page.route('**/realtime/v1/**', async (route) => {
      await route.abort()
    })
  })

  /** Navigate to /notifications and wait for the API response. */
  async function gotoNotifications(page: import('@playwright/test').Page) {
    const response = page.waitForResponse('**/rest/v1/notifications**')
    await page.goto('/notifications')
    await response
  }

  test('should display tabs with correct badges and switch between them', async ({
    page,
  }) => {
    await gotoNotifications(page)

    // Wait for page to load by checking for a notification to be visible
    await expect(
      page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Your quiz score is ready' })
    ).toBeVisible()

    // Verify both tabs are visible with correct badge counts
    const unreadTab = page.getByRole('button', { name: /Unread/ })
    const readTab = page.getByRole('button', { name: /Read/ })
    await expect(unreadTab).toBeVisible()
    await expect(readTab).toBeVisible()
    await expect(unreadTab).toContainText('2')
    await expect(readTab).toContainText('2')

    // Verify default tab shows unread notifications
    await expect(
      page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Your quiz score is ready' })
    ).toBeVisible()
    await expect(
      page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'New text added to library' })
    ).toBeVisible()
    await expect(
      page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Reading session complete' })
    ).not.toBeVisible()

    // Switch to Read tab and verify content
    await readTab.click()
    await expect(
      page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Reading session complete' })
    ).toBeVisible()
    await expect(
      page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Account settings updated' })
    ).toBeVisible()
    await expect(
      page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Your quiz score is ready' })
    ).not.toBeVisible()
  })

  test('should handle "Mark all as read" button correctly', async ({
    page,
  }) => {
    await gotoNotifications(page)

    const markAllButton = page.getByRole('button', { name: 'Mark all as read' })

    // Button should be visible and enabled in Unread tab
    await expect(markAllButton).toBeVisible()
    await expect(markAllButton).toBeEnabled()

    // Switch to Read tab - button should not be visible
    await page.getByRole('button', { name: /Read/ }).click()
    await expect(markAllButton).not.toBeVisible()

    // Go back to Unread tab and click button
    await page.getByRole('button', { name: /Unread/ }).click()

    // Set up a promise to wait for the PATCH request
    const updateRequestPromise = page.waitForRequest(
      (request) =>
        request.url().includes('/notifications') && request.method() === 'PATCH'
    )

    await markAllButton.click()

    // Verify the PATCH request was sent
    const updateRequest = await updateRequestPromise
    expect(updateRequest).toBeTruthy()
  })

  test('should show visual indicators for notification states', async ({
    page,
  }) => {
    await gotoNotifications(page)

    // Find the notification row containing "Your quiz score is ready"
    const unreadNotification = page.locator('button').filter({
      has: page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Your quiz score is ready' }),
    })

    // Check unread notification has "New" badge
    await expect(unreadNotification.getByText('New')).toBeVisible()

    // Check clickable notification has chevron icon (specifically the chevron-right)
    await expect(
      unreadNotification.locator('svg.lucide-chevron-right')
    ).toBeVisible()

    // Find non-clickable notification
    const nonClickableNotification = page.locator('button').filter({
      has: page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'New text added to library' }),
    })

    // Check non-clickable notification has invisible chevron (for alignment)
    const chevron = nonClickableNotification.locator('svg.lucide-chevron-right')
    await expect(chevron).toHaveClass(/invisible/)

    // Switch to Read tab and verify no "New" badge
    await page.getByRole('button', { name: /Read/ }).click()

    const readNotification = page.locator('button').filter({
      has: page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Reading session complete' }),
    })

    const newBadgeCount = await readNotification.getByText('New').count()
    expect(newBadgeCount).toBe(0)
  })

  test('should show empty states when no notifications', async ({ page }) => {
    // Override with only read notifications
    await page.route('**/rest/v1/notifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNotifications.filter((n) => n.seen)),
      })
    })

    await gotoNotifications(page)

    // Verify empty state in Unread tab
    await expect(page.getByText('No unread notifications.')).toBeVisible()

    // Verify button is disabled
    const markAllButton = page.getByRole('button', { name: 'Mark all as read' })
    await expect(markAllButton).toBeDisabled()

    // Switch to Read tab and verify it has content
    await page.getByRole('button', { name: /Read/ }).click()
    await expect(
      page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Reading session complete' })
    ).toBeVisible()
  })

  test('should sort notifications by date descending', async ({ page }) => {
    await gotoNotifications(page)

    // Get all notification buttons and verify they are in correct order
    // We know first should be "Your quiz score is ready" and second should be "New text added to library"
    const firstNotification = page.locator('button').filter({
      has: page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'Your quiz score is ready' }),
    })

    const secondNotification = page.locator('button').filter({
      has: page
        .locator('p.text-sm.font-medium')
        .filter({ hasText: 'New text added to library' }),
    })

    // Both should be visible
    await expect(firstNotification).toBeVisible()
    await expect(secondNotification).toBeVisible()

    // Get the bounding boxes to verify position
    const firstBox = await firstNotification.boundingBox()
    const secondBox = await secondNotification.boundingBox()

    // First notification should be above second (smaller y coordinate)
    expect(firstBox).not.toBeNull()
    expect(secondBox).not.toBeNull()
    expect(firstBox!.y).toBeLessThan(secondBox!.y)
  })
})
