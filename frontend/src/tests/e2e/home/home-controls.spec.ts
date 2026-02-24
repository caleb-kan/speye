import { test, expect } from '@playwright/test'
import { mockAuthSession, mockRandomText } from '../utils/utils'

test.describe('Home Reading Controls', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
    await mockRandomText(page, {
      title: 'Controls Test Text',
      content: 'A passage to test reading controls and their behavior.',
      fiction: true,
      complexity: 6,
    })
  })

  test('shows reading controls bar', async ({ page }) => {
    await page.goto('/home')

    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New text' })).toBeVisible()
  })

  test('displays text title', async ({ page }) => {
    await page.goto('/home')

    await expect(page.getByText('Controls Test Text')).toBeVisible()
  })

  test('shows word progress indicator', async ({ page }) => {
    await page.goto('/home')

    // Match the "N / M words" progress format
    await expect(page.getByText(/\d+\s*\/\s*\d+\s*words/i)).toBeVisible()
  })
})
