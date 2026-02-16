import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QuizSetEditor } from '../../../components/library/QuizSetEditor'
import type { QuestionSet } from '../../../types/database'
import { NUM_QUESTIONS } from '../../../constants/quiz'

const makeSet = (questionCount = NUM_QUESTIONS): QuestionSet => ({
  questions: Array.from({ length: questionCount }, (_, i) => ({
    question: `Question ${i + 1}`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
  })),
})

const defaultProps = {
  set: makeSet(),
  setIndex: 0,
  expanded: false,
  onToggle: vi.fn(),
  onQuestionTextChange: vi.fn(),
  onOptionChange: vi.fn(),
  onCorrectAnswerChange: vi.fn(),
}

describe('QuizSetEditor', () => {
  it('renders the set header with 1-based index', () => {
    render(<QuizSetEditor {...defaultProps} setIndex={2} />)
    expect(screen.getByText('Question Set 3')).toBeInTheDocument()
  })

  it('shows question count', () => {
    render(<QuizSetEditor {...defaultProps} set={makeSet(5)} />)
    expect(screen.getByText('(5 questions)')).toBeInTheDocument()
  })

  it('calls onToggle when header is clicked', () => {
    const onToggle = vi.fn()
    render(<QuizSetEditor {...defaultProps} onToggle={onToggle} />)

    fireEvent.click(screen.getByText('Question Set 1'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('hides questions when collapsed', () => {
    render(<QuizSetEditor {...defaultProps} expanded={false} />)
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument()
  })

  it('shows questions when expanded', () => {
    render(<QuizSetEditor {...defaultProps} expanded={true} />)
    expect(screen.getByLabelText('Question 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Question 2')).toBeInTheDocument()
  })

  it('forwards onQuestionTextChange with question index', () => {
    const onQuestionTextChange = vi.fn()
    render(
      <QuizSetEditor
        {...defaultProps}
        expanded={true}
        onQuestionTextChange={onQuestionTextChange}
      />
    )

    fireEvent.change(screen.getByDisplayValue('Question 1'), {
      target: { value: 'Updated' },
    })
    expect(onQuestionTextChange).toHaveBeenCalledWith(0, 'Updated')
  })

  it('forwards onOptionChange with question and option indices', () => {
    const onOptionChange = vi.fn()
    render(
      <QuizSetEditor
        {...defaultProps}
        expanded={true}
        onOptionChange={onOptionChange}
      />
    )

    const optionInputs = screen.getAllByDisplayValue('A')
    fireEvent.change(optionInputs[0], {
      target: { value: 'New A' },
    })
    expect(onOptionChange).toHaveBeenCalledWith(0, 0, 'New A')
  })

  it('forwards onCorrectAnswerChange with question and option indices', () => {
    const onCorrectAnswerChange = vi.fn()
    render(
      <QuizSetEditor
        {...defaultProps}
        expanded={true}
        onCorrectAnswerChange={onCorrectAnswerChange}
      />
    )

    const radios = screen.getAllByRole('radio', {
      name: 'Mark option B as correct',
    })
    fireEvent.click(radios[0])
    expect(onCorrectAnswerChange).toHaveBeenCalledWith(0, 1)
  })

  it('passes disabled to child editors', () => {
    render(<QuizSetEditor {...defaultProps} expanded={true} disabled={true} />)

    const textareas = screen.getAllByRole('textbox')
    textareas.forEach((ta) => expect(ta).toBeDisabled())
  })
})
