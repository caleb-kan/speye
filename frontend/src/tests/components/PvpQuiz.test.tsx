import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PvpQuiz } from '../../components/pvp/game/PvpQuiz'
import type { QuestionSet } from '../../types/database'

const MOCK_QUESTIONS: QuestionSet = {
  questions: [
    {
      question: 'What is 1 + 1?',
      options: ['A1', 'B1', 'C1', 'D1'],
      correctAnswer: 1,
    },
    {
      question: 'What is 2 + 2?',
      options: ['A2', 'B2', 'C2', 'D2'],
      correctAnswer: 2,
    },
    {
      question: 'What is 3 + 3?',
      options: ['A3', 'B3', 'C3', 'D3'],
      correctAnswer: 1,
    },
  ],
}

// advanceQuestion uses queueMicrotask to guard against double-calls.
// Microtasks don't run between synchronous fireEvent calls, so we must
// flush them explicitly between question advances.
async function flushMicrotasks() {
  await act(async () => {})
}

describe('PvpQuiz', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the first question', () => {
    const onFinish = vi.fn()
    render(<PvpQuiz questionSet={MOCK_QUESTIONS} onFinish={onFinish} />)

    expect(screen.getByText('What is 1 + 1?')).toBeInTheDocument()
    expect(screen.getByText('A1')).toBeInTheDocument()
    expect(screen.getByText('B1')).toBeInTheDocument()
    expect(screen.getByText('C1')).toBeInTheDocument()
    expect(screen.getByText('D1')).toBeInTheDocument()
  })

  it('shows "I don\'t know" option', () => {
    const onFinish = vi.fn()
    render(<PvpQuiz questionSet={MOCK_QUESTIONS} onFinish={onFinish} />)

    expect(
      screen.getByRole('button', { name: "I don't know" })
    ).toBeInTheDocument()
  })

  it('shows Next Question button after selecting an answer', () => {
    const onFinish = vi.fn()
    render(<PvpQuiz questionSet={MOCK_QUESTIONS} onFinish={onFinish} />)

    expect(screen.queryByText('Next Question')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('B1'))

    expect(screen.getByText('Next Question')).toBeInTheDocument()
  })

  it('shows Finish Quiz on the last question', async () => {
    const onFinish = vi.fn()
    render(<PvpQuiz questionSet={MOCK_QUESTIONS} onFinish={onFinish} />)

    fireEvent.click(screen.getByText('B1'))
    fireEvent.click(screen.getByText('Next Question'))
    await flushMicrotasks()

    fireEvent.click(screen.getByText('C2'))
    fireEvent.click(screen.getByText('Next Question'))
    await flushMicrotasks()

    fireEvent.click(screen.getByText('B3'))
    expect(screen.getByText('Finish Quiz')).toBeInTheDocument()
  })

  it('calculates correct score and calls onFinish', async () => {
    const onFinish = vi.fn()
    render(<PvpQuiz questionSet={MOCK_QUESTIONS} onFinish={onFinish} />)

    // Q1: correct answer is index 1 ('B1')
    fireEvent.click(screen.getByText('B1'))
    fireEvent.click(screen.getByText('Next Question'))
    await flushMicrotasks()

    // Q2: correct answer is index 2 ('C2')
    fireEvent.click(screen.getByText('C2'))
    fireEvent.click(screen.getByText('Next Question'))
    await flushMicrotasks()

    // Q3: correct answer is index 1 ('B3')
    fireEvent.click(screen.getByText('B3'))
    fireEvent.click(screen.getByText('Finish Quiz'))

    // 3/3 correct = 100
    expect(onFinish).toHaveBeenCalledWith(100)
  })

  it('scores partial correctness', async () => {
    const onFinish = vi.fn()
    render(<PvpQuiz questionSet={MOCK_QUESTIONS} onFinish={onFinish} />)

    // Q1: pick wrong (A1 instead of B1)
    fireEvent.click(screen.getByText('A1'))
    fireEvent.click(screen.getByText('Next Question'))
    await flushMicrotasks()

    // Q2: correct (C2)
    fireEvent.click(screen.getByText('C2'))
    fireEvent.click(screen.getByText('Next Question'))
    await flushMicrotasks()

    // Q3: correct (B3)
    fireEvent.click(screen.getByText('B3'))
    fireEvent.click(screen.getByText('Finish Quiz'))

    // 2/3 correct = 67
    expect(onFinish).toHaveBeenCalledWith(67)
  })

  it('auto-advances when timer expires', () => {
    const onFinish = vi.fn()
    render(<PvpQuiz questionSet={MOCK_QUESTIONS} onFinish={onFinish} />)

    // Let timer expire for Q1 (20s)
    act(() => {
      vi.advanceTimersByTime(20000)
    })

    // Should be on Q2 now
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
  })

  it('renders nothing for empty question set', () => {
    const onFinish = vi.fn()
    const { container } = render(
      <PvpQuiz questionSet={{ questions: [] }} onFinish={onFinish} />
    )

    expect(container.innerHTML).toBe('')
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('"I don\'t know" counts as wrong answer', () => {
    const onFinish = vi.fn()
    const singleQ: QuestionSet = {
      questions: [
        {
          question: 'Only question?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
        },
      ],
    }

    render(<PvpQuiz questionSet={singleQ} onFinish={onFinish} />)

    fireEvent.click(screen.getByRole('button', { name: "I don't know" }))
    fireEvent.click(screen.getByText('Finish Quiz'))

    expect(onFinish).toHaveBeenCalledWith(0)
  })
})
