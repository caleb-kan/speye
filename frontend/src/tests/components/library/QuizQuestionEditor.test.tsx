import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QuizQuestionEditor } from '../../../components/library/QuizQuestionEditor'
import type { QuizQuestion } from '../../../types/database'

const makeQuestion = (overrides: Partial<QuizQuestion> = {}): QuizQuestion => ({
  question: 'What is 2+2?',
  options: ['One', 'Two', 'Three', 'Four'],
  correctAnswer: 3,
  ...overrides,
})

const defaultProps = {
  question: makeQuestion(),
  setIndex: 0,
  questionIndex: 0,
  onQuestionTextChange: vi.fn(),
  onOptionChange: vi.fn(),
  onCorrectAnswerChange: vi.fn(),
}

describe('QuizQuestionEditor', () => {
  it('renders question label with 1-based index', () => {
    render(<QuizQuestionEditor {...defaultProps} questionIndex={2} />)
    expect(screen.getByText('Question 3')).toBeInTheDocument()
  })

  it('renders question text in textarea', () => {
    render(<QuizQuestionEditor {...defaultProps} />)
    expect(screen.getByDisplayValue('What is 2+2?')).toBeInTheDocument()
  })

  it('renders all option labels (A, B, C, D)', () => {
    render(<QuizQuestionEditor {...defaultProps} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('renders option values in text inputs', () => {
    render(<QuizQuestionEditor {...defaultProps} />)
    expect(screen.getByDisplayValue('One')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Two')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Three')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Four')).toBeInTheDocument()
  })

  it('calls onQuestionTextChange when textarea changes', () => {
    const onQuestionTextChange = vi.fn()
    render(
      <QuizQuestionEditor
        {...defaultProps}
        onQuestionTextChange={onQuestionTextChange}
      />
    )

    fireEvent.change(screen.getByDisplayValue('What is 2+2?'), {
      target: { value: 'New question' },
    })
    expect(onQuestionTextChange).toHaveBeenCalledWith('New question')
  })

  it('calls onOptionChange when option text changes', () => {
    const onOptionChange = vi.fn()
    render(
      <QuizQuestionEditor {...defaultProps} onOptionChange={onOptionChange} />
    )

    fireEvent.change(screen.getByDisplayValue('Two'), {
      target: { value: 'Updated' },
    })
    expect(onOptionChange).toHaveBeenCalledWith(1, 'Updated')
  })

  it('calls onCorrectAnswerChange when radio is clicked', () => {
    const onCorrectAnswerChange = vi.fn()
    render(
      <QuizQuestionEditor
        {...defaultProps}
        onCorrectAnswerChange={onCorrectAnswerChange}
      />
    )

    const radioA = screen.getByRole('radio', {
      name: 'Mark option A as correct',
    })
    fireEvent.click(radioA)
    expect(onCorrectAnswerChange).toHaveBeenCalledWith(0)
  })

  it('checks the correct radio button based on correctAnswer', () => {
    render(
      <QuizQuestionEditor
        {...defaultProps}
        question={makeQuestion({ correctAnswer: 1 })}
      />
    )

    const radioB = screen.getByRole('radio', {
      name: 'Mark option B as correct',
    })
    expect(radioB).toBeChecked()

    const radioA = screen.getByRole('radio', {
      name: 'Mark option A as correct',
    })
    expect(radioA).not.toBeChecked()
  })

  it('disables all inputs when disabled is true', () => {
    render(<QuizQuestionEditor {...defaultProps} disabled />)

    expect(screen.getByDisplayValue('What is 2+2?')).toBeDisabled()
    expect(screen.getByDisplayValue('One')).toBeDisabled()
    expect(screen.getByDisplayValue('Two')).toBeDisabled()
    expect(screen.getByDisplayValue('Three')).toBeDisabled()
    expect(screen.getByDisplayValue('Four')).toBeDisabled()

    const radios = screen.getAllByRole('radio')
    radios.forEach((radio) => expect(radio).toBeDisabled())
  })

  it('uses setIndex in radio name to avoid cross-set collisions', () => {
    const { container } = render(
      <QuizQuestionEditor {...defaultProps} setIndex={2} questionIndex={1} />
    )

    const radio = container.querySelector('input[name="correct-2-1"]')
    expect(radio).toBeInTheDocument()
  })

  it('uses setIndex in textarea id to avoid cross-set collisions', () => {
    render(
      <QuizQuestionEditor {...defaultProps} setIndex={2} questionIndex={1} />
    )

    expect(screen.getByLabelText('Question 2')).toHaveAttribute(
      'id',
      'question-2-1'
    )
  })

  it('highlights correct answer option border', () => {
    const { container } = render(
      <QuizQuestionEditor
        {...defaultProps}
        question={makeQuestion({ correctAnswer: 0 })}
      />
    )

    const textInputs = container.querySelectorAll('input[type="text"]')
    expect(textInputs[0].className).toContain('border-primary/50')
    expect(textInputs[1].className).toContain('border-text-secondary/20')
  })
})
