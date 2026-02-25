import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QuizEditor } from '../../../components/library/QuizEditor'
import type { Quiz } from '../../../types/database'
import { MAX_QUESTION_SETS, MIN_QUESTIONS } from '../../../constants/quiz'

const makeQuestion = (text: string) => ({
  question: text,
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 0,
})

const makeSet = (prefix: string) => ({
  questions: Array.from({ length: MIN_QUESTIONS }, (_, i) =>
    makeQuestion(`Q${i + 1} ${prefix}`)
  ),
})

const makeQuiz = (): Quiz => ({
  questionSets: Array.from({ length: MAX_QUESTION_SETS }, (_, i) =>
    makeSet(`Set${i + 1}`)
  ),
})

const defaultProps = {
  quiz: makeQuiz(),
  onSubmit: vi.fn(),
  onUnsavedChangesUpdate: vi.fn(),
  textHasUnsavedChanges: false,
}

describe('QuizEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all question sets', () => {
    render(<QuizEditor {...defaultProps} />)
    expect(screen.getByText('Question Set 1')).toBeInTheDocument()
    expect(screen.getByText('Question Set 2')).toBeInTheDocument()
  })

  it('expands the first set by default', () => {
    render(<QuizEditor {...defaultProps} />)
    expect(screen.getByDisplayValue('Q1 Set1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Q2 Set1')).toBeInTheDocument()
  })

  it('does not expand other sets by default', () => {
    render(<QuizEditor {...defaultProps} />)
    expect(screen.queryByDisplayValue('Q1 Set2')).not.toBeInTheDocument()
  })

  it('toggles set expansion on click', () => {
    render(<QuizEditor {...defaultProps} />)

    fireEvent.click(screen.getByText('Question Set 2'))
    expect(screen.getByDisplayValue('Q1 Set2')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Question Set 1'))
    expect(screen.queryByDisplayValue('Q1 Set1')).not.toBeInTheDocument()
  })

  it('disables Save Quiz button when no changes', () => {
    render(<QuizEditor {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Save Quiz' })).toBeDisabled()
  })

  it('enables Save Quiz button after a change', () => {
    render(<QuizEditor {...defaultProps} />)

    fireEvent.change(screen.getByDisplayValue('Q1 Set1'), {
      target: { value: 'Modified' },
    })

    expect(screen.getByRole('button', { name: 'Save Quiz' })).toBeEnabled()
  })

  it('calls onUnsavedChangesUpdate when changes are made', () => {
    const onUnsavedChangesUpdate = vi.fn()
    render(
      <QuizEditor
        {...defaultProps}
        onUnsavedChangesUpdate={onUnsavedChangesUpdate}
      />
    )

    fireEvent.change(screen.getByDisplayValue('Q1 Set1'), {
      target: { value: 'Modified' },
    })

    expect(onUnsavedChangesUpdate).toHaveBeenCalledWith(true)
  })

  it('calls onSubmit with edited quiz on save', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<QuizEditor {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByDisplayValue('Q1 Set1'), {
      target: { value: 'Modified Q1' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Quiz' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      const submittedQuiz = onSubmit.mock.calls[0][0]
      expect(submittedQuiz.questionSets[0].questions[0].question).toBe(
        'Modified Q1'
      )
    })
  })

  it('shows error when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Save failed'))
    render(<QuizEditor {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByDisplayValue('Q1 Set1'), {
      target: { value: 'Modified' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Quiz' }))

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument()
    })
  })

  it('shows validation error for empty question text', async () => {
    const onSubmit = vi.fn()
    render(<QuizEditor {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByDisplayValue('Q1 Set1'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Quiz' }))

    await waitFor(() => {
      expect(screen.getByText(/question text is empty/)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows Saving... while submitting', async () => {
    const onSubmit = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
    render(<QuizEditor {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByDisplayValue('Q1 Set1'), {
      target: { value: 'Modified' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Quiz' }))

    expect(
      screen.getByRole('button', { name: 'Saving...' })
    ).toBeInTheDocument()
  })

  it('allows editing option text', () => {
    render(<QuizEditor {...defaultProps} />)

    // Multiple options with value 'A' exist across questions in set 1
    const allOptionA = screen.getAllByDisplayValue('A')
    fireEvent.change(allOptionA[0], {
      target: { value: 'New A' },
    })

    expect(screen.getByDisplayValue('New A')).toBeInTheDocument()
  })

  it('allows changing correct answer', () => {
    render(<QuizEditor {...defaultProps} />)

    // Multiple "Mark option B" radios exist across questions in set 1
    const allRadioB = screen.getAllByRole('radio', {
      name: 'Mark option B as correct',
    })
    fireEvent.click(allRadioB[0])

    expect(allRadioB[0]).toBeChecked()
  })

  it('disables Save Quiz when textHasUnsavedChanges is true', () => {
    render(<QuizEditor {...defaultProps} textHasUnsavedChanges />)

    fireEvent.change(screen.getByDisplayValue('Q1 Set1'), {
      target: { value: 'Modified' },
    })

    expect(screen.getByRole('button', { name: 'Save Quiz' })).toBeDisabled()
  })

  it('shows warning when textHasUnsavedChanges is true', () => {
    render(<QuizEditor {...defaultProps} textHasUnsavedChanges />)

    expect(
      screen.getByText(
        'Save text changes first. Editing text will regenerate the quiz.'
      )
    ).toBeInTheDocument()
  })

  it('does not show warning when textHasUnsavedChanges is false', () => {
    render(<QuizEditor {...defaultProps} textHasUnsavedChanges={false} />)

    expect(
      screen.queryByText(
        'Save text changes first. Editing text will regenerate the quiz.'
      )
    ).not.toBeInTheDocument()
  })

  it('resets editor state when quiz prop changes', () => {
    const quiz1 = makeQuiz()
    const quiz2: Quiz = {
      questionSets: Array.from({ length: MAX_QUESTION_SETS }, (_, i) =>
        makeSet(`New${i + 1}`)
      ),
    }

    const { rerender } = render(<QuizEditor {...defaultProps} quiz={quiz1} />)
    // Make an edit
    fireEvent.change(screen.getByDisplayValue('Q1 Set1'), {
      target: { value: 'Modified' },
    })
    expect(screen.getByDisplayValue('Modified')).toBeInTheDocument()

    // Change the quiz prop
    rerender(<QuizEditor {...defaultProps} quiz={quiz2} />)
    expect(screen.getByDisplayValue('Q1 New1')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Modified')).not.toBeInTheDocument()
  })
})
