import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EditTextModal } from '../../components/EditTextModal'
import { AuthContext } from '../../context/authContext'
import type { Text, Quiz } from '../../types/database'
import type { User, Session } from '@supabase/supabase-js'
import { NUM_QUESTION_SETS, NUM_QUESTIONS } from '../../constants/quiz'

const mockUser = { id: 'user-123', email: 'test@example.com' } as User
const mockSession = { user: mockUser } as Session

const renderWithAuth = (
  ui: React.ReactElement,
  { user = mockUser }: { user?: User | null } = {}
) => {
  return render(
    <AuthContext.Provider
      value={{
        user,
        session: user ? mockSession : null,
        loading: false,
        signOut: vi.fn(),
      }}
    >
      {ui}
    </AuthContext.Provider>
  )
}

const makeQuestion = (text: string) => ({
  question: text,
  options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
  correctAnswer: 0,
})

const makeSet = (prefix: string) => ({
  questions: Array.from({ length: NUM_QUESTIONS }, (_, i) =>
    makeQuestion(`${prefix} Q${i + 1}`)
  ),
})

const mockQuiz: Quiz = {
  questionSets: Array.from({ length: NUM_QUESTION_SETS }, (_, i) =>
    makeSet(`Set${i + 1}`)
  ),
}

const textWithQuiz: Text = {
  id: '1',
  title: 'Test Title',
  content: 'Test content',
  summary: null,
  fiction: true,
  uploaded_at: '2026-01-01',
  owner_id: 'user-123',
  quiz: mockQuiz,
  complexity: null,
  source: null,
  processing_status: 'completed',
  quiz_valid: true,
  llm_decision: null,
  llm_violation_type: null,
  admin_decision: null,
  admin_reviewed_by: null,
  admin_reviewed_at: null,
  rejection_reason: null,
  rejection_stage: null,
}

const textWithoutQuiz: Text = {
  ...textWithQuiz,
  quiz: null,
}

const defaultProps = {
  isOpen: true,
  text: textWithQuiz,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  onQuizSubmit: vi.fn(),
}

describe('EditTextModal tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows tabs when text has a quiz', () => {
    renderWithAuth(<EditTextModal {...defaultProps} />)
    expect(screen.getByRole('tab', { name: 'Text' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Quiz' })).toBeInTheDocument()
  })

  it('does not show tabs when text has no quiz', () => {
    renderWithAuth(<EditTextModal {...defaultProps} text={textWithoutQuiz} />)
    expect(screen.queryByRole('tab', { name: 'Text' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Quiz' })).not.toBeInTheDocument()
  })

  it('does not show tabs when onQuizSubmit is not provided', () => {
    renderWithAuth(<EditTextModal {...defaultProps} onQuizSubmit={undefined} />)
    expect(screen.queryByRole('tab', { name: 'Text' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Quiz' })).not.toBeInTheDocument()
  })

  it('starts on the Text tab by default', () => {
    renderWithAuth(<EditTextModal {...defaultProps} />)
    expect(screen.getByLabelText('Text Content')).toBeInTheDocument()
  })

  it('switches to Quiz tab when clicked', () => {
    renderWithAuth(<EditTextModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))
    expect(
      screen.getByRole('button', { name: 'Save Quiz' })
    ).toBeInTheDocument()
  })

  it('switches back to Text tab', () => {
    renderWithAuth(<EditTextModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Text' }))
    expect(screen.getByLabelText('Text Content')).toBeInTheDocument()
  })

  it('shows quiz questions in the Quiz tab', () => {
    renderWithAuth(<EditTextModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))
    expect(screen.getByDisplayValue('Set1 Q1')).toBeInTheDocument()
  })

  it('calls onQuizSubmit when quiz is saved', async () => {
    const onQuizSubmit = vi.fn().mockResolvedValue(undefined)
    renderWithAuth(
      <EditTextModal {...defaultProps} onQuizSubmit={onQuizSubmit} />
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))
    fireEvent.change(screen.getByDisplayValue('Set1 Q1'), {
      target: { value: 'Modified question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Quiz' }))

    await waitFor(() => {
      expect(onQuizSubmit).toHaveBeenCalledWith(
        textWithQuiz.id,
        expect.objectContaining({
          questionSets: expect.arrayContaining([
            expect.objectContaining({
              questions: expect.arrayContaining([
                expect.objectContaining({
                  question: 'Modified question',
                }),
              ]),
            }),
          ]),
        })
      )
    })
  })

  it('calls onClose after successful quiz save', async () => {
    const onClose = vi.fn()
    const onQuizSubmit = vi.fn().mockResolvedValue(undefined)
    renderWithAuth(
      <EditTextModal
        {...defaultProps}
        onClose={onClose}
        onQuizSubmit={onQuizSubmit}
      />
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))
    fireEvent.change(screen.getByDisplayValue('Set1 Q1'), {
      target: { value: 'Modified' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Quiz' }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows unsaved warning when closing with quiz changes', () => {
    renderWithAuth(<EditTextModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))
    fireEvent.change(screen.getByDisplayValue('Set1 Q1'), {
      target: { value: 'Modified' },
    })

    fireEvent.click(screen.getByLabelText('Close modal'))

    expect(screen.getByText('Discard Changes?')).toBeInTheDocument()
  })

  it('shows unsaved warning when closing with text changes', () => {
    renderWithAuth(<EditTextModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Text Content'), {
      target: { value: 'Modified content' },
    })

    fireEvent.click(screen.getByLabelText('Close modal'))

    expect(screen.getByText('Discard Changes?')).toBeInTheDocument()
  })

  it('closes modal after discarding unsaved changes', () => {
    const onClose = vi.fn()
    renderWithAuth(<EditTextModal {...defaultProps} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Text Content'), {
      target: { value: 'Modified content' },
    })
    fireEvent.click(screen.getByLabelText('Close modal'))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('returns to editing when cancelling discard', () => {
    const onClose = vi.fn()
    renderWithAuth(<EditTextModal {...defaultProps} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Text Content'), {
      target: { value: 'Modified content' },
    })
    fireEvent.click(screen.getByLabelText('Close modal'))
    fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByText('Discard Changes?')).not.toBeInTheDocument()
  })

  it('resets to Text tab when modal reopens', () => {
    const { rerender } = renderWithAuth(<EditTextModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))
    expect(
      screen.getByRole('button', { name: 'Save Quiz' })
    ).toBeInTheDocument()

    // Close and reopen
    rerender(
      <AuthContext.Provider
        value={{
          user: mockUser,
          session: mockSession,
          loading: false,
          signOut: vi.fn(),
        }}
      >
        <EditTextModal {...defaultProps} isOpen={false} />
      </AuthContext.Provider>
    )
    rerender(
      <AuthContext.Provider
        value={{
          user: mockUser,
          session: mockSession,
          loading: false,
          signOut: vi.fn(),
        }}
      >
        <EditTextModal {...defaultProps} isOpen={true} />
      </AuthContext.Provider>
    )

    // Should be back on Text tab
    expect(screen.getByLabelText('Text Content')).toBeInTheDocument()
  })

  it('closes modal on ESC key when no unsaved changes', () => {
    const onClose = vi.fn()
    renderWithAuth(<EditTextModal {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('shows unsaved warning on ESC key when there are unsaved changes', () => {
    const onClose = vi.fn()
    renderWithAuth(<EditTextModal {...defaultProps} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Text Content'), {
      target: { value: 'Modified content' },
    })
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Discard Changes?')).toBeInTheDocument()
  })

  it('closes modal on backdrop click when no unsaved changes', () => {
    const onClose = vi.fn()
    renderWithAuth(<EditTextModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).toHaveBeenCalled()
  })

  it('shows unsaved warning on backdrop click with unsaved changes', () => {
    const onClose = vi.fn()
    renderWithAuth(<EditTextModal {...defaultProps} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Text Content'), {
      target: { value: 'Modified content' },
    })
    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Discard Changes?')).toBeInTheDocument()
  })

  it('does not close modal when quiz save fails', async () => {
    const onClose = vi.fn()
    const onQuizSubmit = vi.fn().mockRejectedValue(new Error('Network error'))
    renderWithAuth(
      <EditTextModal
        {...defaultProps}
        onClose={onClose}
        onQuizSubmit={onQuizSubmit}
      />
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))
    fireEvent.change(screen.getByDisplayValue('Set1 Q1'), {
      target: { value: 'Modified' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Quiz' }))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('disables quiz save button when text has unsaved changes', () => {
    renderWithAuth(<EditTextModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Text Content'), {
      target: { value: 'Modified content' },
    })
    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }))

    expect(screen.getByRole('button', { name: 'Save Quiz' })).toBeDisabled()
    expect(
      screen.getByText(
        'Save text changes first. Editing text will regenerate the quiz.'
      )
    ).toBeInTheDocument()
  })
})
