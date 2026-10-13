import { test, expect, type Page } from '@playwright/test'
import { mockAuthSession, mockRandomText } from '../utils/utils'
import {
  mockAdminAuthSession,
  mockAdminEndpoints,
  mockLibraryTexts,
  mockRealtimeSubscription,
} from '../utils/mock-helpers'
import { libraryTexts, pendingApprovals, quizData } from '../utils/mocks'
import { TEXTS_PER_PAGE } from '../../../constants/library'

async function expectContained(page: Page) {
  const excess = await page
    .locator('main')
    .evaluate((main) => Math.max(main.scrollWidth - main.clientWidth, 0))
  expect(excess).toBeLessThanOrEqual(1)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 1 })
    localStorage.setItem('pwa-install-banner-dismissed', '1')
  })
  await mockRealtimeSubscription(page)
})

for (const viewport of [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 320, height: 240 },
  { width: 1440, height: 900 },
]) {
  test(`library pagination and navigation stay usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockAuthSession(page)
    await mockLibraryTexts(
      page,
      Array.from({ length: TEXTS_PER_PAGE * 2 + 1 }, (_, index) => ({
        ...libraryTexts[0],
        id: `pagination-text-${index}`,
        title: `Synthetic pagination text ${index}`,
      }))
    )
    await page.goto('/library')
    const pagination = page.locator('[aria-label="Pagination"]')
    const navigation = page.getByRole('navigation', {
      name: 'Main navigation',
    })
    await expect(pagination).toContainText('1 / 3')
    const expectPaginationClear = async () => {
      await pagination.evaluate((element) =>
        element.scrollIntoView({ block: 'center', behavior: 'instant' })
      )
      await expect(pagination).toBeInViewport()
      const navigationBox = await navigation.boundingBox()
      const paginationBox = await pagination.boundingBox()
      expect(paginationBox!.x).toBeGreaterThanOrEqual(0)
      expect(paginationBox!.x + paginationBox!.width).toBeLessThanOrEqual(
        viewport.width
      )
      if (viewport.height < 768 || viewport.width < 768) {
        expect(paginationBox!.y + paginationBox!.height).toBeLessThanOrEqual(
          navigationBox!.y
        )
      }
      for (const button of await pagination.getByRole('button').all()) {
        expect(
          await button.evaluate((element) => {
            const box = element.getBoundingClientRect()
            return element.contains(
              document.elementFromPoint(
                box.x + box.width / 2,
                box.y + box.height / 2
              )
            )
          })
        ).toBe(true)
        if (viewport.height < 768 || viewport.width < 768) {
          const box = await button.boundingBox()
          // Firefox can report 44px as 43.999996px through float rounding.
          expect(box!.width).toBeGreaterThanOrEqual(44 - 0.01)
          expect(box!.height).toBeGreaterThanOrEqual(44 - 0.01)
        }
      }
    }
    await expectPaginationClear()
    if (viewport.width === 320 && viewport.height === 844) {
      await page.evaluate(() =>
        document.documentElement.style.setProperty(
          '--mobile-navigation-height',
          'calc(4rem + 30px)'
        )
      )
      await expect
        .poll(async () => {
          const box = await pagination.boundingBox()
          const navigationBox = await navigation.boundingBox()
          return box!.y + box!.height <= navigationBox!.y
        })
        .toBe(true)
      await expectPaginationClear()
    }
    await page.screenshot({ path: test.info().outputPath('pagination.png') })
    await expect(
      pagination.getByRole('button', { name: 'Previous page' })
    ).toBeDisabled()
    await pagination.getByRole('button', { name: 'Next page' }).click()
    await expect(pagination).toContainText('2 / 3')
    await pagination.getByRole('button', { name: 'Last page' }).click()
    await expect(pagination).toContainText('3 / 3')
    await expect(
      pagination.getByRole('button', { name: 'Next page' })
    ).toBeDisabled()
    await pagination.getByRole('button', { name: 'Previous page' }).click()
    await expect(pagination).toContainText('2 / 3')
    await pagination.getByRole('button', { name: 'First page' }).click()
    await pagination.getByRole('button', { name: '1', exact: true }).click()
    await pagination
      .getByRole('textbox', { name: 'Jump to page number' })
      .fill('9'.repeat(40))
    await expectContained(page)
    await expectPaginationClear()
    await pagination
      .getByRole('textbox', { name: 'Jump to page number' })
      .fill('3')
    await pagination
      .getByRole('textbox', { name: 'Jump to page number' })
      .press('Enter')
    await expect(pagination).toContainText('3 / 3')
    await pagination.getByRole('button', { name: 'First page' }).click()
    await page.locator('main').evaluate(async (main) => {
      await new Promise(requestAnimationFrame)
      main.scrollTo(0, main.scrollHeight)
    })
    await expectContained(page)
    for (const link of await page
      .getByTestId('footer')
      .getByRole('link')
      .all()) {
      expect(
        await link.evaluate((element) => {
          const box = element.getBoundingClientRect()
          return element.contains(
            document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2
            )
          )
        })
      ).toBe(true)
    }
    await expectPaginationClear()
    for (const link of await navigation.getByRole('link').all()) {
      expect(
        await link.evaluate((element) => {
          const box = element.getBoundingClientRect()
          return element.contains(
            document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2
            )
          )
        })
      ).toBe(true)
    }
    await navigation
      .getByRole('link', { name: 'Settings', exact: true })
      .click()
    await expect(page).toHaveURL(/\/settings$/)
  })
}

for (const width of [320, 390]) {
  test.describe(`Mobile parity at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } })

    test('all admin navigation targets stay visible and unobstructed', async ({
      page,
    }) => {
      await mockAdminAuthSession(page)
      await mockAdminEndpoints(page)
      await page.goto('/admin')
      await expect(
        page.getByRole('heading', { name: 'Admin Panel' })
      ).toBeVisible()

      const navigation = page.getByRole('navigation', {
        name: 'Main navigation',
      })
      for (const name of [
        'Home',
        'Library',
        'Activity',
        'PvP',
        'Settings',
        'Admin',
        'Profile',
      ]) {
        const link = navigation.getByRole('link', { name, exact: true })
        await expect(link).toBeInViewport()
        expect(
          await link.evaluate((element) => {
            const box = element.getBoundingClientRect()
            return element.contains(
              document.elementFromPoint(
                box.x + box.width / 2,
                box.y + box.height / 2
              )
            )
          })
        ).toBe(true)
      }

      await page.getByRole('button', { name: 'Change theme' }).click()
      await expect(
        page.getByRole('radiogroup', { name: 'Theme selector' })
      ).toBeVisible()
      await page.getByRole('radio').first().click()
      await page.getByRole('link', { name: 'Open notifications' }).click()
      await expect(page).toHaveURL(/\/notifications$/)
      await mockLibraryTexts(page, libraryTexts)
      await navigation.getByRole('link', { name: 'Library' }).click()
      await expect(page).toHaveURL(/\/library$/)
      await expect(
        page.getByRole('heading', { name: 'Library', exact: true })
      ).toBeVisible()
      await page.getByTestId('footer-privacy-link').scrollIntoViewIfNeeded()
      await expect(page.getByTestId('footer-privacy-link')).toBeInViewport()
      await expectContained(page)
    })

    test('library upload, summaries and sorting remain usable', async ({
      page,
    }) => {
      await mockAuthSession(page)
      await mockLibraryTexts(page, libraryTexts)
      await page.route('**/rest/v1/texts**', async (route) => {
        const url = new URL(route.request().url())
        const id = url.searchParams.get('id')?.replace(/^eq\./, '')
        if (!id) return route.fallback()
        const text = libraryTexts.find((entry) => entry.id === id)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...text,
            content: 'Local reading text.',
            summary: 'Local text summary.',
          }),
        })
      })
      await page.goto('/library')
      await expect(page.getByLabel('Sort by:')).toBeVisible()
      await page
        .getByRole('button', { name: 'Upload Text', exact: true })
        .click()
      await expect(page.getByLabel('Title', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Close modal' }).click()
      await page.getByRole('button', { name: 'Read summary' }).first().click()
      await expect(page).toHaveURL(/\/rsvp$/)
      await expect(page.getByTestId('summary-badge')).toBeVisible()
      await expectContained(page)
    })

    test('RSVP options fit, close accessibly, and preserve reading controls', async ({
      page,
    }) => {
      await mockAuthSession(page)
      await mockRandomText(page, {
        content: 'Mobile reading controls stay available. '.repeat(20),
      })
      await page.goto('/adaptive')
      await expect(page).toHaveURL(/\/rsvp$/)
      const toggle = page.getByTestId('rsvp-options-toggle')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(
        page.getByRole('button', { name: 'Fiction texts', exact: true })
      ).toHaveCount(0)
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await page
        .getByRole('button', {
          name: 'Set reading speed to 200 words per minute',
        })
        .click()
      await page
        .getByRole('button', { name: 'Enter custom words per minute value' })
        .click()
      await page
        .getByRole('textbox', { name: 'Custom words per minute value' })
        .fill('1')
      await expect(
        page.getByRole('button', { name: 'Play', exact: true })
      ).toBeDisabled()
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(
        page.getByRole('textbox', { name: 'Custom words per minute value' })
      ).toHaveCount(0)
      await page.getByRole('button', { name: 'Play', exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Pause', exact: true })
      ).toBeInViewport()
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
      await expectContained(page)
    })

    test('long account and notification content stays inside the page', async ({
      page,
    }) => {
      await mockAuthSession(page, {
        email: `${'reader'.repeat(15)}@example.com`,
      })
      await page.goto('/profile')
      await expect(
        page.getByRole('heading', { name: /profile/i, exact: true })
      ).toBeVisible()
      await expectContained(page)
      await page.route('**/rest/v1/notifications**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'long-notification',
              user_id: 'user-1',
              message: `https://example.com/${'path'.repeat(50)}`,
              type: 'info',
              seen: false,
              toast_shown: true,
              created_at: new Date().toISOString(),
              link: null,
            },
          ]),
        })
      )
      await page.goto('/notifications')
      await expect(
        page.getByTestId('notification-row-long-notification')
      ).toBeVisible()
      await expectContained(page)
    })
  })
}

for (const width of [320, 768, 1440]) {
  test(`PvP search and all information panels remain available at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockAuthSession(page)
    const rating = {
      user_id: 'user-1',
      elo_rating: 1132,
      peak_elo: 1150,
      games_played: 8,
      wins: 5,
      losses: 3,
      draws: 0,
      users: { username: 'testuser' },
    }
    await page.route('**/rest/v1/pvp_ratings**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          route.request().url().includes('order=') ? [rating] : rating
        ),
      })
    )
    await page.goto('/pvp')
    await expect(
      page.getByRole('button', { name: 'Play PvP', exact: true })
    ).toBeVisible()
    await expect(
      page.getByPlaceholder('Search players by username...')
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Recent Matches' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Elo Leaderboard' })
    ).toBeVisible()
    const rankings = page.getByRole('region', {
      name: 'Elo leaderboard rankings',
    })
    await expect(rankings.getByText('testuser', { exact: true })).toBeVisible()
    await expect(rankings.getByText('5W 3L', { exact: true })).toBeVisible()
    await expect(rankings.getByText('Win%', { exact: true })).toBeVisible()
    await expectContained(page)
  })
}

test('admin preview and confirmation remain contained on narrow, short screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await mockAdminAuthSession(page)
  await mockAdminEndpoints(page)
  await page.route('**/rest/v1/texts**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          ...pendingApprovals[0],
          title: 'Test'.repeat(30),
          content: 'Local synthetic test content.',
        },
      ]),
    })
  )
  await page.goto('/admin')
  await page.getByTitle('View details').click()
  const panel = page.getByRole('dialog').locator(':scope > div').first()
  expect(
    await panel.evaluate((element) => element.scrollWidth - element.clientWidth)
  ).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Close modal' }).click()
  await page.setViewportSize({ width: 320, height: 220 })
  await mockLibraryTexts(page, libraryTexts)
  await page.goto('/library')
  await page.getByRole('button', { name: 'Delete text' }).first().click()
  const bounds = await page.getByRole('alertdialog').boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(220)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
})

test('the mobile manual quiz editor keeps answers and actions accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await mockAuthSession(page)
  const text = {
    ...libraryTexts[0],
    content: 'Local synthetic test content.',
    summary: 'Local summary.',
    quiz: quizData,
  }
  await page.route('**/rest/v1/texts**', (route) => {
    const url = new URL(route.request().url())
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(url.searchParams.has('id') ? text : [text]),
    })
  })
  await page.goto('/library')
  await page.getByRole('button', { name: 'Edit text', exact: true }).click()
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  const answer = page.getByLabel('Option A text').first()
  await answer.fill('Mobile answer edit')
  await expect(answer).toHaveValue('Mobile answer edit')
  const dialog = page.getByRole('dialog', { name: 'Edit Text & Quiz' })
  expect(
    await dialog
      .locator(':scope > div')
      .first()
      .evaluate((element) => element.scrollWidth - element.clientWidth)
  ).toBeLessThanOrEqual(1)
  await dialog.getByRole('button', { name: 'Close modal', exact: true }).click()
  await page
    .getByRole('alertdialog', { name: 'Discard Changes?' })
    .getByRole('button', { name: 'Discard', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
})
