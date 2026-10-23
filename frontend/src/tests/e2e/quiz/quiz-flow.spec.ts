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
