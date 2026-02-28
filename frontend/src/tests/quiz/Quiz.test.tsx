import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

const mockSaveQuizResult = vi.fn().mockResolvedValue({})

vi.mock('../../services/saveQuizResult', () => ({
  saveQuizResult: (...args: unknown[]) => mockSaveQuizResult(...args),
}))

const mockUseAuth = vi.fn().mockReturnValue({
  user: { id: 'test-user-id' },
  session: null,
  loading: false,
  signOut: vi.fn(),
})

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

// Mock leaderboard service
vi.mock('../../services/leaderboardService', () => ({
  getTextLeaderboard: vi.fn().mockResolvedValue({ top: [], currentUser: null }),
  updateLeaderboardCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    forceOffline: false,
    setForceOffline: vi.fn(),
    pendingOperations: 0,
    isSyncing: false,
    syncNow: vi.fn(),
  }),
}))

describe('QuizModal', () => {
  beforeEach(() => {
    const modalRoot = document.createElement('div')
    modalRoot.setAttribute('id', 'modal-root')
    document.body.appendChild(modalRoot)
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
      session: null,
      loading: false,
      signOut: vi.fn(),
    })
    mockSaveQuizResult.mockResolvedValue({})
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
    ownerId: null as string | null,
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

      // Wait for the 3-second score animation phase to end and details to appear
      expect(
        await screen.findByText(/Quiz Complete/i, {}, { timeout: 4000 })
      ).toBeInTheDocument()

      const closeButton = screen.getByRole('button', { name: /Save & Close/i })

      await waitFor(() => {
        expect(closeButton).not.toBeDisabled()
      })

      fireEvent.click(closeButton)

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Anonymous User Flow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
      })
    })

    async function completeQuiz() {
      await screen.findByText(/Comprehension Quiz/i)
      const questionCount = mockQuestionSet.questions.length
      for (let i = 0; i < questionCount; i++) {
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
    }

    it('does not call saveQuizResult for anonymous users', async () => {
      render(
        <MemoryRouter>
          <QuizModal {...defaultProps} />
        </MemoryRouter>
      )
      await completeQuiz()

      expect(
        await screen.findByText(/Quiz Complete/i, {}, { timeout: 4000 })
      ).toBeInTheDocument()

      expect(mockSaveQuizResult).not.toHaveBeenCalled()
    })

    it('shows "Close" instead of "Save & Close" for anonymous users', async () => {
      render(
        <MemoryRouter>
          <QuizModal {...defaultProps} />
        </MemoryRouter>
      )
      await completeQuiz()

      const closeButton = await screen.findByRole(
        'button',
        { name: /^Close$/i },
        { timeout: 4000 }
      )
      expect(closeButton).toBeInTheDocument()
      expect(screen.queryByText('Save & Close')).not.toBeInTheDocument()
    })

    it('shows sign-in prompt on public text for anonymous users', async () => {
      render(
        <MemoryRouter>
          <QuizModal {...defaultProps} ownerId={null} />
        </MemoryRouter>
      )
      await completeQuiz()

      expect(
        await screen.findByText(/Sign in/i, {}, { timeout: 4000 })
      ).toBeInTheDocument()
      expect(screen.getByText(/unlock the leaderboard/i)).toBeInTheDocument()
    })

    it('does not show sign-in prompt on private text for anonymous users', async () => {
      render(
        <MemoryRouter>
          <QuizModal {...defaultProps} ownerId="owner-123" />
        </MemoryRouter>
      )
      await completeQuiz()

      expect(
        await screen.findByText(/Quiz Complete/i, {}, { timeout: 4000 })
      ).toBeInTheDocument()

      expect(
        screen.queryByText(/unlock the leaderboard/i)
      ).not.toBeInTheDocument()
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
