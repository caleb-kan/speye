import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuizPreviewModal } from '../../../components/admin/QuizPreviewModal'
import type { Quiz } from '../../../types/database'
import { UNTITLED_TEXT_FALLBACK } from '../../../constants/admin'

const mockQuiz: Quiz = {
  questionSets: [
    {
      questions: [
        {
          question: 'What is the capital of France?',
          options: ['London', 'Paris', 'Berlin', 'Madrid'],
          correctAnswer: 1,
        },
        {
          question: 'What color is the sky?',
          options: ['Red', 'Green', 'Blue', 'Yellow'],
          correctAnswer: 2,
        },
      ],
    },
    {
      questions: [
        {
          question: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
        },
      ],
    },
  ],
}

describe('QuizPreviewModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render nothing when quiz is null', () => {
    const { container } = render(
      <QuizPreviewModal quiz={null} title="Test" onClose={onClose} />
    )

    expect(container.innerHTML).toBe('')
  })

  it('should render quiz title', () => {
    render(
      <QuizPreviewModal quiz={mockQuiz} title="My Text" onClose={onClose} />
    )

    expect(screen.getByText('Quiz: My Text')).toBeInTheDocument()
  })

  it('should show fallback title when null', () => {
    render(<QuizPreviewModal quiz={mockQuiz} title={null} onClose={onClose} />)

    expect(
      screen.getByText(`Quiz: ${UNTITLED_TEXT_FALLBACK}`)
    ).toBeInTheDocument()
  })

  it('should render all question sets', () => {
    render(<QuizPreviewModal quiz={mockQuiz} title="Test" onClose={onClose} />)

    expect(screen.getByText('Question Set 1')).toBeInTheDocument()
    expect(screen.getByText('Question Set 2')).toBeInTheDocument()
  })

  it('should render questions with their options', () => {
    render(<QuizPreviewModal quiz={mockQuiz} title="Test" onClose={onClose} />)

    expect(
      screen.getByText(/What is the capital of France/)
    ).toBeInTheDocument()
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.getByText('Berlin')).toBeInTheDocument()
    expect(screen.getByText('Madrid')).toBeInTheDocument()
  })

  it('should highlight correct answers', () => {
    render(<QuizPreviewModal quiz={mockQuiz} title="Test" onClose={onClose} />)

    // Paris is the correct answer (index 1)
    const parisOption = screen.getByText('Paris').closest('div')
    expect(parisOption).toHaveClass('bg-success/10')

    // London is incorrect
    const londonOption = screen.getByText('London').closest('div')
    expect(londonOption).not.toHaveClass('bg-success/10')
  })

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup()
    render(<QuizPreviewModal quiz={mockQuiz} title="Test" onClose={onClose} />)

    await user.click(screen.getByLabelText('Close modal'))

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose on Escape key', async () => {
    const user = userEvent.setup()
    render(<QuizPreviewModal quiz={mockQuiz} title="Test" onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('should have proper dialog role', () => {
    render(<QuizPreviewModal quiz={mockQuiz} title="Test" onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'quiz-preview-title')
  })

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<QuizPreviewModal quiz={mockQuiz} title="Test" onClose={onClose} />)

    const backdrop = screen.getByRole('dialog')
    await user.click(backdrop)

    expect(onClose).toHaveBeenCalled()
  })

  it('should not close when inner content is clicked', async () => {
    const user = userEvent.setup()
    render(<QuizPreviewModal quiz={mockQuiz} title="Test" onClose={onClose} />)

    await user.click(screen.getByText('Question Set 1'))

    expect(onClose).not.toHaveBeenCalled()
  })
})
