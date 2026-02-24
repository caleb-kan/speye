import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../utils/utils'
import {
  mockLibraryTexts,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'
import { libraryTexts } from '../utils/mocks'

test.describe('Library Filters', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
    await mockRealtimeSubscription(page)
    await mockLibraryTexts(page, libraryTexts)
  })

  test('shows search input and filter controls', async ({ page }) => {
    await page.goto('/library')

    await expect(
      page.getByPlaceholder('Search texts by title or content...')
    ).toBeVisible()
    await expect(page.getByText('Show Filters')).toBeVisible()
  })

  test('filters texts by title search', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('The Great Adventure')).toBeVisible()

    await page
      .getByPlaceholder('Search texts by title or content...')
      .fill('Adventure')

    await expect(page.getByText(/Found \d+ text/)).toBeVisible()
    await expect(page.getByText('The Great Adventure')).toBeVisible()
    await expect(page.getByText('Quantum Physics Basics')).not.toBeVisible()
  })

  test('shows sort controls with Sort by label', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('Sort by:')).toBeVisible()
  })

  test('toggles filter panel visibility', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('The Great Adventure')).toBeVisible()

    await page.getByText('Show Filters').click()
    await expect(
      page.getByRole('button', {
        name: 'Fiction',
        exact: true,
      })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Non-Fiction' })
    ).toBeVisible()

    await page.getByText('Hide Filters').click()
    await expect(
      page.getByRole('button', {
        name: 'Fiction',
        exact: true,
      })
    ).not.toBeVisible()
  })

  test('search input can be typed into and cleared', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('The Great Adventure')).toBeVisible()

    const searchInput = page.getByPlaceholder(
      'Search texts by title or content...'
    )
    await searchInput.fill('something')
    await expect(searchInput).toHaveValue('something')

    await searchInput.fill('')
    await expect(searchInput).toHaveValue('')
  })

  test('genre filter buttons filter texts', async ({ page }) => {
    await page.goto('/library')
    await expect(page.getByText('The Great Adventure')).toBeVisible()

    await page.getByText('Show Filters').click()
    await page.getByRole('button', { name: 'Fiction', exact: true }).click()

    await expect(page.getByText(/Found \d+ text/)).toBeVisible()
    // Fiction texts should be visible
    await expect(page.getByText('The Great Adventure')).toBeVisible()
  })
})
