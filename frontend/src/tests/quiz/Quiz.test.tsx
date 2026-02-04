import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuizModal } from '../../components/quiz/QuizModal'
import '@testing-library/jest-dom'
import type { QuestionSet } from '../../types/database'

const mockQuestionSet: QuestionSet = {
  questions: [
    {
      question: 'What is the primary benefit of speed reading?',
      options: [
        'Higher comprehension',
        'Faster processing',
        'Better memory',
        'Reduced eye strain',
      ],
      correctAnswer: 1,
    },
    {
      question: 'Which technique involves minimizing subvocalization?',
      options: [
        'Chunking',
        'Skimming',
        'Meta guiding',
        'Eliminating inner speech',
      ],
      correctAnswer: 3,
    },
  ],
}

// Mock the save service
vi.mock('../services/saveQuizResult', () => ({
  saveQuizResult: vi.fn().mockResolvedValue({}),
}))

describe('QuizModal', () => {
  beforeEach(() => {
    const modalRoot = document.createElement('div')
    modalRoot.setAttribute('id', 'modal-root')
    document.body.appendChild(modalRoot)
    vi.clearAllMocks()
  })

  afterEach(() => {
    const modalRoot = document.getElementById('modal-root')
    if (modalRoot) {
      document.body.removeChild(modalRoot)
    }
  })

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    questionSet: mockQuestionSet,
    textId: 'test-text-id',
    wpm: 200,
  }

  describe('Visibility', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <QuizModal
          {...defaultProps}
          isOpen={false}
          questionSet={mockQuestionSet}
        />
      )
      // Since it's false, it should never appear, so queryBy is correct here
      const question = screen.queryByRole('heading', { level: 3 })
      expect(question).not.toBeInTheDocument()
    })

    it('renders content when isOpen is true', async () => {
      render(<QuizModal {...defaultProps} questionSet={mockQuestionSet} />)
      // Use findByText to wait for the mounting animation state
      expect(await screen.findByText(/Comprehension Quiz/i)).toBeInTheDocument()
    })
  })

  describe('User Interaction Flow', () => {
    it('renders the first question and options', async () => {
      render(<QuizModal {...defaultProps} />)

      expect(
        await screen.findByText('What is the primary benefit of speed reading?')
      ).toBeInTheDocument()
      expect(screen.getByText('Faster processing')).toBeInTheDocument()
      expect(screen.getByText('Better memory')).toBeInTheDocument()
    })

    it('selects an option when clicked', async () => {
      render(<QuizModal {...defaultProps} />)

      const option = await screen.findByText('Faster processing')

      // Verify initial state
      const button = option.closest('button')
      // Ensure it exists first
      expect(button).toBeInTheDocument()

      fireEvent.click(button!)

      // Verify selected state class (bg-primary)
      expect(button).toHaveClass('bg-primary')
    })

    it('does not show the "Next/Finish" button when no option is selected', async () => {
      render(<QuizModal {...defaultProps} />)

      // Wait for modal to load first
      await screen.findByText(/Comprehension Quiz/i)

      const actionButton = screen.queryByRole('button', {
        name: /Finish Quiz|Next Question/i,
      })

      expect(actionButton).not.toBeInTheDocument()
    })

    it('shows the button when an option is selected', async () => {
      render(<QuizModal {...defaultProps} />)

      const option = await screen.findByText('Faster processing')
      const optionButton = option.closest('button')!

      fireEvent.click(optionButton)

      const actionButton = await screen.findByRole('button', {
        name: /Finish Quiz|Next Question/i,
      })
      expect(actionButton).toBeInTheDocument()
    })

    it('shows results and calls onClose only when closing the results view', async () => {
      render(<QuizModal {...defaultProps} />)

      // Wait for load
      await screen.findByText(/Comprehension Quiz/i)

      const questionCount = defaultProps.questionSet?.questions.length || 0

      for (let i = 0; i < questionCount; i++) {
        // We need to re-query elements in each loop iteration because
        // the DOM structure might update (especially with key={currentIndex})
        const options = screen
          .getAllByRole('button')
          .filter(
            (btn) =>
              !['Next Question', 'Finish Quiz', 'Close', 'Save & Close'].some(
                (t) => btn.textContent?.includes(t)
              )
          )

        fireEvent.click(options[0])

        const actionButton = await screen.findByRole('button', {
          name: i === questionCount - 1 ? /Finish Quiz/i : /Next Question/i,
        })
        fireEvent.click(actionButton)
      }

      expect(defaultProps.onClose).not.toHaveBeenCalled()

      expect(await screen.findByText(/Quiz Complete/i)).toBeInTheDocument()

      const closeButton = screen.getByRole('button', { name: /Save & Close/i })

      await waitFor(() => {
        expect(closeButton).not.toBeDisabled()
      })

      fireEvent.click(closeButton)

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Overlay Behavior', () => {
    it('locks body scroll when open', async () => {
      render(<QuizModal {...defaultProps} />)
      // Wait for effect to run
      await screen.findByText(/Comprehension Quiz/i)
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restores body scroll when unmounted/closed', async () => {
      const { unmount } = render(<QuizModal {...defaultProps} />)
      await screen.findByText(/Comprehension Quiz/i)
      unmount()
      expect(document.body.style.overflow).toBe('')
    })

    it('calls onClose when clicking the backdrop', async () => {
      const onClose = vi.fn()
      render(
        <QuizModal
          {...defaultProps}
          isOpen={true}
          onClose={onClose}
          questionSet={mockQuestionSet}
        />
      )

      // Wait for modal to mount
      await screen.findByText(/Comprehension Quiz/i)

      const backdrop = document.querySelector('.bg-black\\/40')

      expect(backdrop).toBeInTheDocument()
      fireEvent.click(backdrop!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when pressing Escape key', async () => {
      const onClose = vi.fn()
      render(
        <QuizModal
          {...defaultProps}
          isOpen={true}
          onClose={onClose}
          questionSet={mockQuestionSet}
        />
      )

      await screen.findByText(/Comprehension Quiz/i)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
