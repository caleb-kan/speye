import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuizModal } from '../components/quiz/QuizModal'
import '@testing-library/jest-dom'
import type { QuestionSet } from '../types/database'

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

describe('QuizModal', () => {
  // Setup DOM for React Portal
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
      const question = screen.queryByRole('heading', { level: 3 })
      expect(question).not.toBeInTheDocument()
    })

    it('renders content when isOpen is true', () => {
      render(<QuizModal {...defaultProps} questionSet={mockQuestionSet} />)
      expect(screen.getByText(/Comprehension Quiz/i)).toBeInTheDocument()
    })
  })

  describe('User Interaction Flow', () => {
    it('renders the first question and options', () => {
      render(<QuizModal {...defaultProps} />)

      expect(
        screen.getByText('What is the primary benefit of speed reading?')
      ).toBeInTheDocument()
      expect(screen.getByText('Faster processing')).toBeInTheDocument()
      expect(screen.getByText('Better memory')).toBeInTheDocument()
    })

    it('selects an option when clicked', () => {
      render(<QuizModal {...defaultProps} />)

      const option = screen.getByText('Faster processing')

      // Verify initial state (unselected styles roughly)
      const button = option.closest('button')
      expect(button).toHaveClass('bg-white/5')

      // Click option
      fireEvent.click(button!)

      // Verify selected state styling applied
      expect(button).toHaveClass('bg-primary')
    })

    it('does not show the "Next/Finish" button when no option is selected', () => {
      render(<QuizModal {...defaultProps} />)

      const actionButton = screen.queryByRole('button', {
        name: /Finish Quiz|Next Question/i,
      })

      expect(actionButton).not.toBeInTheDocument()
    })

    it('shows the button when an option is selected', () => {
      render(<QuizModal {...defaultProps} />)

      // Initially button should not be visible
      expect(
        screen.queryByRole('button', { name: /Finish Quiz|Next Question/i })
      ).not.toBeInTheDocument()

      // Select an answer
      const optionButton = screen
        .getByText('Faster processing')
        .closest('button')!
      fireEvent.click(optionButton)

      // Button should now appear
      const actionButton = screen.getByRole('button', {
        name: /Finish Quiz|Next Question/i,
      })
      expect(actionButton).toBeInTheDocument()
    })

    it('calls onClose when finishing the last question', () => {
      render(<QuizModal {...defaultProps} />)

      // Click through all questions until we reach the last one
      let actionButton: HTMLElement | null = null

      // Loop through questions
      while (true) {
        // Select the first option for current question
        const options = screen
          .getAllByRole('button')
          .filter(
            (btn) =>
              btn.textContent &&
              !btn.textContent.includes('Next Question') &&
              !btn.textContent.includes('Finish Quiz')
          )
        fireEvent.click(options[0])

        // Get the action button (now visible after selection)
        actionButton = screen.getByRole('button', {
          name: /Next Question|Finish Quiz/i,
        })

        // If it's "Finish Quiz", we're on the last question
        if (actionButton.textContent?.includes('Finish Quiz')) {
          break
        }

        // Otherwise click "Next Question" to proceed
        fireEvent.click(actionButton)
      }

      // Click Finish Quiz
      fireEvent.click(actionButton!)

      // Expect close handler to be called
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Overlay Behavior', () => {
    it('locks body scroll when open', () => {
      render(<QuizModal {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restores body scroll when unmounted/closed', () => {
      const { unmount } = render(<QuizModal {...defaultProps} />)
      unmount()
      expect(document.body.style.overflow).toBe('')
    })

    it('calls onClose when clicking the backdrop', () => {
      const onClose = vi.fn()
      render(
        <QuizModal
          isOpen={true}
          onClose={onClose}
          questionSet={mockQuestionSet}
        />
      )

      const backdrop = document.querySelector('.fixed.inset-0')
      fireEvent.click(backdrop!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when pressing Escape key', () => {
      const onClose = vi.fn()
      render(
        <QuizModal
          isOpen={true}
          onClose={onClose}
          questionSet={mockQuestionSet}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
