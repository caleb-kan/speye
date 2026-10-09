import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { StartQuizButton } from '../../components/StartQuizButton'

const state = vi.hoisted(() => ({ getQuiz: vi.fn(), save: vi.fn() }))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'reader' } }),
}))
vi.mock('../../services/getQuiz', () => ({ getQuiz: state.getQuiz }))
vi.mock('../../services/saveQuizResult', () => ({ saveQuizResult: state.save }))
vi.mock('../../components/quiz/QuizOverlay', () => ({
  QuizOverlay: ({
    isOpen,
    children,
  }: {
    isOpen: boolean
    children: React.ReactNode
  }) => (isOpen ? children : null),
}))
vi.mock('../../components/quiz/QuizResults', () => ({
  QuizResults: () => null,
}))

it('keeps the originating activity when another attempt begins while the quiz loads', async () => {
  let finishLoading!: (value: unknown) => void
  state.getQuiz.mockReturnValue(
    new Promise((resolve) => {
      finishLoading = resolve
    })
  )
  state.save.mockResolvedValue(null)
  let currentActivityId = 'original-activity'
  render(
    <StartQuizButton
      textId="text-a"
      ownerId={null}
      readingComplete
      dismissed={false}
      onDismiss={() => {}}
      getActivityId={() => currentActivityId}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Start Quiz' }))
  currentActivityId = 'newer-activity'
  await act(async () =>
    finishLoading({
      questions: [
        {
          question: 'Question?',
          options: ['Correct', 'Wrong'],
          correctAnswer: 0,
        },
      ],
    })
  )
  fireEvent.click(screen.getByText('Correct'))
  fireEvent.click(screen.getByRole('button', { name: 'Finish Quiz' }))
  await waitFor(() =>
    expect(state.save).toHaveBeenCalledWith(
      { text_id: 'text-a', activity_id: 'original-activity', score: 100 },
      'reader'
    )
  )
})
