import { test, expect } from '@playwright/test'
import { mockAuthSession, mockRandomText } from '../utils/utils'
import { quizData } from '../utils/mocks'

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

  test('handles missing quiz gracefully', async ({ page }) => {
    await mockRandomText(page, {
      title: 'No Quiz Text',
      content: 'This text has no quiz data attached.',
      quiz: null,
      quiz_valid: false,
    })
    await page.goto('/home')

    await expect(page.getByText('No Quiz Text')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  })

  test('shows quiz modal with question after clicking Start Quiz', async ({
    page,
  }) => {
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
  })

  test('allows selecting an answer and shows Next Question', async ({
    page,
  }) => {
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
})
