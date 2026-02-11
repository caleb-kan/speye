import { test, expect } from '@playwright/test'
import { mockRandomText } from './utils'

test('home page loads', async ({ page }) => {
  await mockRandomText(page)

  await page.goto('/home')

  await expect(
    page.getByRole('navigation', { name: 'Main navigation' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})
