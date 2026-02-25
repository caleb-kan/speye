import { test, expect } from '@playwright/test'
import { mockRandomText } from './utils/utils'

test.describe('Primary navigation', () => {
  test('main navigation links move between pages', async ({ page }) => {
    await mockRandomText(page)

    await page.goto('/login')

    await page.getByRole('link', { name: 'Library' }).click()
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()

    await page.getByRole('link', { name: 'Activity' }).click()
    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'about' })).toBeVisible()

    await page.getByRole('link', { name: 'Log in' }).click()
    await expect(
      page.getByRole('heading', { name: /welcome back/i })
    ).toBeVisible()

    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  })

  test('unknown routes show a not found message', async ({ page }) => {
    await mockRandomText(page)

    await page.goto('/does-not-exist')

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()

    await page.getByRole('link', { name: 'Go home' }).click()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  })
})
