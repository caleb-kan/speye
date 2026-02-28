import { test, expect } from '@playwright/test'
import { mockAuthSession, setPageOffline } from '../utils/utils'

test.describe('Offline / PWA', () => {
  // ── OfflineCacheSection ────────────────────────────────────────────────────

  test('settings page shows offline cache section', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(page.locator('#offline-cache')).toBeVisible()
    await expect(page.getByText('Texts cached')).toBeVisible()
    await expect(page.getByText('Cache size')).toBeVisible()
    await expect(page.getByText('Last synced')).toBeVisible()
  })

  test('clear cache button is disabled when no texts are cached', async ({
    page,
  }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    // textCount starts at 0 (empty IndexedDB) so the button must be disabled
    await expect(
      page.locator('#offline-cache').getByRole('button', {
        name: /clear cache/i,
      })
    ).toBeDisabled()
  })

  test('sync now button is enabled when online', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await expect(
      page.locator('#offline-cache').getByRole('button', { name: /sync now/i })
    ).not.toBeDisabled()
  })

  test('force offline toggle changes aria-checked state', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    const toggle = page
      .locator('#offline-cache')
      .locator('button[aria-checked]')
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    // Turning it back off should restore the original state
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  test('sync now button is disabled while force offline is active', async ({
    page,
  }) => {
    await mockAuthSession(page)
    await page.goto('/settings')

    await page.locator('#offline-cache').locator('button[aria-checked]').click()
    await expect(
      page.locator('#offline-cache').getByRole('button', { name: /sync now/i })
    ).toBeDisabled()
  })

  // ── OfflineIndicator ───────────────────────────────────────────────────────

  test('offline indicator is not visible when online', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/home')

    // OfflineIndicator returns null when indicatorState === 'online'
    await expect(
      page.getByRole('button', { name: /view offline cache settings/i })
    ).not.toBeVisible()
  })

  test('offline indicator appears when force offline is seeded in localStorage', async ({
    page,
  }) => {
    // mockAuthSession removes speye-force-offline; add a subsequent init
    // script to re-set it so the app boots in forced-offline mode.
    await mockAuthSession(page)
    await page.addInitScript(() => {
      localStorage.setItem('speye-force-offline', 'true')
    })
    await page.goto('/home')

    await expect(
      page.getByRole('button', { name: /view offline cache settings/i })
    ).toBeVisible()
  })

  test('offline indicator appears when browser network goes offline', async ({
    page,
  }) => {
    await mockAuthSession(page)
    await page.goto('/home')

    // setPageOffline blocks the network AND explicitly updates navigator.onLine
    // + re-dispatches the event in the page context, avoiding two race conditions:
    // (1) the offline event firing before React's useEffect registers its listener,
    // (2) WebKit not updating navigator.onLine through a configurable override.
    await setPageOffline(page, true)

    await expect(
      page.getByRole('button', { name: /view offline cache settings/i })
    ).toBeVisible()
  })

  test('offline indicator hides after coming back online', async ({ page }) => {
    await mockAuthSession(page)
    await page.goto('/home')

    await setPageOffline(page, true)
    await expect(
      page.getByRole('button', { name: /view offline cache settings/i })
    ).toBeVisible()

    await setPageOffline(page, false)

    // Wait for the component to be completely removed from DOM
    // This is more reliable than waiting for visibility changes
    await page.waitForSelector(
      'button[aria-label="View offline cache settings"]',
      { state: 'detached', timeout: 10000 }
    )
  })

  test('clicking offline indicator navigates to cache settings', async ({
    page,
  }) => {
    await mockAuthSession(page)
    await page.addInitScript(() => {
      localStorage.setItem('speye-force-offline', 'true')
    })
    await page.goto('/home')

    await page
      .getByRole('button', { name: /view offline cache settings/i })
      .click()

    await expect(page).toHaveURL(/\/settings/)
  })
})
