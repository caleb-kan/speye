import { test, expect } from '@playwright/test'
import { mockAuthSession, mockRandomText } from '../utils/utils'
import { quizData } from '../utils/mocks'
import { mockRealtimeSubscription } from '../utils/mock-helpers'

test.describe('Quiz Flow', () => {
  const textWithQuiz = {
    id: 'quiz-text-1',
    title: 'Quiz Test Text',
    content: 'Word '.repeat(10).trim(),
    quiz: quizData,
    quiz_valid: true,
    processing_status: 'completed' as const,
  }

  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)

    await page.route(
      (url) =>
        url.pathname.includes('/rest/v1/texts') &&
        url.search.includes('select=quiz'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ quiz: quizData }),
        })
      }
    )

    // Leaderboard reads from Upstash Redis REST API, not Supabase
    await page.route('**/pipeline**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/rest/v1/rpc/save_quiz_result**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.route('**/rest/v1/user_activity**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      } else {
        // Return empty activity for GET requests
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })
  })

  test('shows Start Quiz button after reading completes', async ({ page }) => {
    await mockRandomText(page, textWithQuiz)
    await page.goto('/home')
    await expect(page.getByText('Quiz Test Text')).toBeVisible()

    await page.getByRole('button', { name: 'Play' }).click()

    const startQuiz = page.getByRole('button', {
      name: /start quiz/i,
    })
    await expect(startQuiz).toBeVisible({ timeout: 30000 })
  })

  test('shows quiz modal and allows answering questions', async ({ page }) => {
    await mockRandomText(page, textWithQuiz)
    await page.goto('/home')

    await page.getByRole('button', { name: 'Play' }).click()

    const startQuiz = page.getByRole('button', {
      name: /start quiz/i,
    })
    await expect(startQuiz).toBeVisible({ timeout: 30000 })
    await startQuiz.click()

    await expect(
      page.getByText(/what is the main topic of the text/i)
    ).toBeVisible({ timeout: 10000 })

    await page.getByText('Science').click()

    await expect(
      page.getByRole('button', { name: /next question/i })
    ).toBeVisible()
  })

  test('completes quiz and shows results', async ({ page }) => {
    const firstAnswers = [
      'Science',
      'A scientist',
      'A city',
      'Morning',
      'Serious',
    ]

    await mockRandomText(page, textWithQuiz)
    await page.goto('/home')

    await page.getByRole('button', { name: 'Play' }).click()

    const startQuiz = page.getByRole('button', {
      name: /start quiz/i,
    })
    await expect(startQuiz).toBeVisible({ timeout: 30000 })
    await startQuiz.click()

    for (let i = 0; i < 5; i++) {
      await expect(page.getByText(firstAnswers[i])).toBeVisible({
        timeout: 10000,
      })

      await page.getByText(firstAnswers[i]).click()

      if (i < 4) {
        await page.getByRole('button', { name: /next question/i }).click()
      } else {
        await page.getByRole('button', { name: /finish quiz/i }).click()
      }
    }

    await expect(page.getByText('Quiz Complete')).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByRole('button', { name: /save & close/i })
    ).toBeVisible()
  })

  for (const width of [320, 390]) {
    test(`leaderboard usernames and scores remain reachable at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 1 })
        localStorage.setItem('pwa-install-banner-dismissed', '1')
      })
      await mockRealtimeSubscription(page)
      await page.route('**/pipeline**', (route) =>
        route.fulfill({ json: [{ result: [] }] })
      )
      await page.route('**/rest/v1/rpc/get_text_leaderboard**', (route) =>
        route.fulfill({
          json: {
            top: [
              {
                userId: '00000000-0000-4000-8000-000000000002',
                username: 'Synthetic Reader',
                avatarUrl: null,
                wpm: 425,
                quizScore: 80,
                overallScore: 1000000,
                rank: 1,
              },
            ],
            currentUser: null,
          },
        })
      )
      await page.route('**/functions/v1/leaderboard', (route) =>
        route.fulfill({ json: { success: true } })
      )
      await mockRandomText(page, textWithQuiz)
      await page.goto('/rsvp')
      await page.getByRole('button', { name: 'Play', exact: true }).click()
      await page
        .getByRole('button', { name: 'Start Quiz', exact: true })
        .click()

      const dialog = page.getByRole('dialog', { name: 'Reading quiz' })
      const answers = ['Science', 'A scientist', 'A city', 'Morning', 'Serious']
      for (const [index, answer] of answers.entries()) {
        await dialog.getByText(answer, { exact: true }).click()
        await dialog
          .getByRole('button', {
            name:
              index === answers.length - 1 ? 'Finish Quiz' : 'Next Question',
            exact: true,
          })
          .click()
      }

      const username = dialog.getByTitle('Synthetic Reader', { exact: true })
      await expect(username).toBeVisible({ timeout: 15000 })
      await expect(username).toBeInViewport()
      expect((await username.boundingBox())?.width).toBeGreaterThanOrEqual(96)

      const rankings = dialog.getByRole('region', {
        name: 'Leaderboard rankings',
        exact: true,
      })
      await expect(rankings).toBeVisible()
      expect(
        await rankings.evaluate(
          (element) => element.scrollWidth > element.clientWidth
        )
      ).toBe(true)
      await rankings.focus()
      await rankings.press('ArrowRight')
      await expect
        .poll(() => rankings.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0)
      await rankings.evaluate((element) => {
        element.scrollLeft = element.scrollWidth
      })
      await expect(
        username.locator('..').getByText('1000000', { exact: true })
      ).toBeInViewport()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        )
      ).toBe(true)
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth
        )
      ).toBe(true)
    })
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 320, height: 240 },
  ]) {
    test(`long quiz content remains reachable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      const longQuiz = {
        questionSets: quizData.questionSets.map((set) => ({
          questions: set.questions.map((question) => ({
            ...question,
            question: 'Synthetic question: '.concat(
              'Which explanation best describes the evidence presented in the passage? '.repeat(
                3
              )
            ),
            options: question.options.map(
              (_, index) =>
                `Synthetic answer ${index + 1}: ` +
                'The passage provides detailed evidence supporting this explanation of the outcome. '.repeat(
                  3
                )
            ),
          })),
        })),
      }
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 1 })
        localStorage.setItem('pwa-install-banner-dismissed', '1')
      })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await mockRealtimeSubscription(page)
      await page.route(
        (url) =>
          url.pathname.includes('/rest/v1/texts') &&
          url.search.includes('select=quiz'),
        (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ quiz: longQuiz }),
          })
      )
      await mockRandomText(page, { ...textWithQuiz, quiz: longQuiz })
      await page.goto('/rsvp')
      await page.getByRole('button', { name: 'Play', exact: true }).click()
      await page
        .getByRole('button', { name: 'Start Quiz', exact: true })
        .click()
      const dialog = page.getByRole('dialog', { name: 'Reading quiz' })
      await expect(dialog).toBeVisible()
      await page.setViewportSize(viewport)

      await expect
        .poll(async () => {
          const dialogBox = await dialog.boundingBox()
          return (
            dialogBox !== null &&
            dialogBox.y >= 0 &&
            dialogBox.y + dialogBox.height <= viewport.height
          )
        })
        .toBe(true)
      await expect(dialog.getByRole('heading').first()).toBeInViewport()

      for (let index = 0; index < 5; index++) {
        await dialog
          .getByRole('button', { name: /^Synthetic answer 1:/ })
          .click()
        const advance = dialog.getByRole('button', {
          name: index === 4 ? 'Finish Quiz' : 'Next Question',
          exact: true,
        })
        await advance.click()
      }

      await dialog.getByRole('button', { name: 'Save & Close' }).click()
      await expect(dialog).not.toBeVisible()
    })
  }
})
