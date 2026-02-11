import { test, expect } from '@playwright/test'
import {
  mockAuthTokenError,
  mockAuthTokenSuccess,
  mockRandomText,
} from './utils'

test.describe('Login form', () => {
  test('sign in takes you to the home reader', async ({ page }) => {
    await mockAuthTokenSuccess(page)
    await mockRandomText(page)

    await page.goto('/login')

    await page.getByLabel('Email').fill('reader@example.com')
    await page.getByLabel('Password').fill('correct-horse-battery-staple')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await page.waitForURL('**/home')
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  })

  test('invalid credentials show an error message', async ({ page }) => {
    await mockAuthTokenError(page)

    await page.goto('/login')

    await page.getByLabel('Email').fill('reader@example.com')
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByRole('alert')).toHaveText(/invalid/i)
  })
})
