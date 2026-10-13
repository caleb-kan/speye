import { test, expect, type Page } from '@playwright/test'
import { mockAuthSession } from './utils/utils'
import { libraryTexts, quizData } from './utils/mocks'
import { makeGame } from '../helpers/pvpMockFactory'

const readingKey = 'pvp-submit-reading:game-1:user-1'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

async function prepareGame(page: Page, words = 100) {
  await mockAuthSession(page)
  await page.addInitScript(() => {
    localStorage.setItem('pwa-install-banner-dismissed', '1')
    localStorage.setItem(
      'reading-preferences',
      JSON.stringify({ mode: 'rsvp', wpm: 2000, phraseSize: 1 })
    )
  })
  await page.route('**/realtime/v1/**', (route) => route.abort())
  let game = makeGame({
    reading_started_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  })
  const requests = { activities: 0, submits: 0, forfeits: 0 }
  page.on('request', (request) => {
    if (request.method() !== 'POST') return
    const path = new URL(request.url()).pathname
    if (path.endsWith('/user_activity')) requests.activities++
    if (path.endsWith('/rpc/forfeit_pvp_game')) requests.forfeits++
  })
  await page.route('**/rest/v1/pvp_games**', (route) =>
    route.fulfill({ json: game })
  )
  await page.route('**/rest/v1/texts**', (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has('id')
        ? {
            id: 'text-1',
            title: 'Recovery test',
            content: 'word '.repeat(words),
            source: null,
            fiction: false,
            complexity: 5,
            quiz: quizData,
          }
        : libraryTexts,
    })
  )
  await page.route('**/rest/v1/users**', (route) =>
    route.fulfill({
      json: [
        { id: 'user-1', username: 'testuser' },
        { id: 'user-2', username: 'opponent' },
      ],
    })
  )
  await page.route('**/rest/v1/pvp_ratings**', (route) =>
    route.fulfill({
      json: {
        user_id: 'user-1',
        elo_rating: 1000,
        games_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      },
    })
  )
  await page.route('**/rest/v1/rpc/get_server_time**', (route) =>
    route.fulfill({ json: new Date().toISOString() })
  )
  await page.route('**/rest/v1/rpc/submit_pvp_result**', async (route) => {
    requests.submits++
    game = {
      ...game,
      player1_wpm: 300,
      player1_quiz_score: 80,
      player1_overall_score: 220,
      player1_finished_at: new Date().toISOString(),
    }
    await route.fulfill({ json: game })
  })
  return requests
}

async function leaveAndReturn(page: Page) {
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await navigation.getByRole('link', { name: 'Library', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Library', exact: true })
  ).toBeVisible()
  await navigation.getByRole('link', { name: 'PvP', exact: true }).click()
  await expect(page).toHaveURL(/\/pvp\/game-1$/)
}

test('SPA recovery preserves position and timing while document reload forfeits', async ({
  page,
}) => {
  const requests = await prepareGame(page)
  await page.goto('/pvp/game-1')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        return JSON.parse(sessionStorage.getItem(key) ?? '{}').wordIndex ?? 0
      }, readingKey)
    )
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const position = await page
    .getByTestId('progress-word-count-text')
    .innerText()
  const before = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    readingKey
  )
  await leaveAndReturn(page)
  await expect(page.getByTestId('progress-word-count-text')).toHaveText(
    position
  )
  const after = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    readingKey
  )
  expect(after.readingStartedAt).toBe(before.readingStartedAt)
  expect(after.gameStartedAt).toBe(before.gameStartedAt)
  expect(requests.forfeits).toBe(0)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeVisible()
  await expect.poll(() => requests.forfeits).toBe(1)
  await expect(page.getByTestId('progress-word-count-text')).toHaveText(
    '1 / 100 words'
  )
})

test('completed reading returns to quiz with its original WPM and one activity', async ({
  page,
}) => {
  const requests = await prepareGame(page, 10)
  await page.goto('/pvp/game-1')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(
    page.getByText('Comprehension Quiz', { exact: true })
  ).toBeVisible()
  const before = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    readingKey
  )
  await expect.poll(() => requests.activities).toBe(1)
  await leaveAndReturn(page)
  await expect(
    page.getByText('Comprehension Quiz', { exact: true })
  ).toBeVisible()
  const after = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    readingKey
  )
  expect(after.completedWpm).toBe(before.completedWpm)
  expect(after.wordIndex).toBe(10)
  expect(requests.activities).toBe(1)
  expect(requests.submits).toBe(0)
  expect(requests.forfeits).toBe(0)
})

test('pending recovery and confirmed server recovery both stay waiting', async ({
  page,
}) => {
  const requests = await prepareGame(page)
  await page.addInitScript((key) => {
    sessionStorage.setItem(
      'pvp-submit-game-1:user-1',
      JSON.stringify({
        gameId: 'game-1',
        userId: 'user-1',
        wpm: 300,
        score: 80,
      })
    )
    sessionStorage.setItem(
      key,
      JSON.stringify({
        wordIndex: 100,
        readingStartedAt: new Date(Date.now() - 20000).toISOString(),
        gameStartedAt: Date.now() - 20000,
        completedWpm: 300,
      })
    )
  }, readingKey)
  await page.goto('/pvp/game-1')
  const waiting = page.getByRole('status', {
    name: 'Waiting for opponent to finish',
  })
  await expect(waiting).toContainText('300')
  await expect(waiting).toContainText('80%')
  await expect(waiting).toContainText('220')
  await expect.poll(() => requests.submits).toBe(1)
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), readingKey)
  ).toBeNull()
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem('pvp-submit-game-1:user-1')
    )
  ).toBeNull()
  await leaveAndReturn(page)
  await expect(waiting).toContainText('300')
  await expect(waiting).toContainText('80%')
  await expect(waiting).toContainText('220')
  expect(requests.submits).toBe(1)
  expect(requests.activities).toBe(0)
  expect(requests.forfeits).toBe(0)
})

for (const pending of [
  { key: 'pvp-submit-game-1', data: { wpm: 300, score: 80 } },
  {
    key: 'pvp-submit-game-1:user-1',
    data: { gameId: 'game-1', userId: 'user-2', wpm: 300, score: 80 },
  },
]) {
  test(`unverifiable pending result does not submit for the current player (${pending.key})`, async ({
    page,
  }) => {
    const requests = await prepareGame(page)
    await page.addInitScript(
      (record) =>
        sessionStorage.setItem(record.key, JSON.stringify(record.data)),
      pending
    )
    await page.goto('/pvp/game-1')
    await expect(
      page.getByRole('button', { name: 'Play', exact: true })
    ).toBeVisible()
    await expect(page.getByTestId('progress-word-count-text')).toHaveText(
      '1 / 100 words'
    )
    expect(requests.submits).toBe(0)
    expect(
      await page.evaluate((key) => sessionStorage.getItem(key), pending.key)
    ).toBeNull()
  })
}
