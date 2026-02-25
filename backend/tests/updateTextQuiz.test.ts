import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Quiz } from '../supabase/database/texts/types'
import {
  MIN_QUESTION_SETS,
  MAX_QUESTION_SETS,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  NUM_OPTIONS_PER_QUESTION,
} from '../../lib/quizConstants'

vi.mock('../../lib/supabase', () => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockEq = vi.fn(() => ({ select: mockSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))

  return {
    supabase: { from: mockFrom },
    _mocks: { mockFrom, mockUpdate, mockEq, mockSelect, mockSingle },
  }
})

vi.mock('../supabase/database/logger', () => ({
  logDbQuery: vi.fn(),
}))

import {
  assertValidQuiz,
  updateTextQuiz,
} from '../supabase/database/texts/updateTextQuiz'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { _mocks } = (await import('../../lib/supabase')) as any

const makeQuestion = (
  overrides: Partial<{
    question: string
    options: string[]
    correctAnswer: number
  }> = {}
) => ({
  question: 'What is 2+2?',
  options: ['1', '2', '3', '4'],
  correctAnswer: 3,
  ...overrides,
})

const makeSet = (questionsOverride?: ReturnType<typeof makeQuestion>[]) => ({
  questions:
    questionsOverride ??
    Array.from({ length: MIN_QUESTIONS }, () => makeQuestion()),
})

const makeValidQuiz = (): Quiz => ({
  questionSets: Array.from({ length: MAX_QUESTION_SETS }, () => makeSet()),
})

describe('assertValidQuiz', () => {
  it('accepts a valid quiz', () => {
    expect(() => assertValidQuiz(makeValidQuiz())).not.toThrow()
  })

  it('rejects null quiz', () => {
    expect(() => assertValidQuiz(null as unknown as Quiz)).toThrow(
      'Invalid quiz structure'
    )
  })

  it('rejects quiz with missing questionSets', () => {
    expect(() => assertValidQuiz({} as unknown as Quiz)).toThrow(
      'Invalid quiz structure'
    )
  })

  it('rejects quiz with no sets', () => {
    const quiz: Quiz = { questionSets: [] }
    expect(() => assertValidQuiz(quiz)).toThrow(
      `Quiz must have between ${MIN_QUESTION_SETS} and ${MAX_QUESTION_SETS} question sets`
    )
  })

  it('rejects quiz with too many sets', () => {
    const quiz: Quiz = {
      questionSets: Array.from({ length: MAX_QUESTION_SETS + 1 }, () =>
        makeSet()
      ),
    }
    expect(() => assertValidQuiz(quiz)).toThrow(
      `Quiz must have between ${MIN_QUESTION_SETS} and ${MAX_QUESTION_SETS} question sets`
    )
  })

  it('rejects set with non-array questions', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0] = {
      questions: null,
    } as unknown as Quiz['questionSets'][0]
    expect(() => assertValidQuiz(quiz)).toThrow(
      'Invalid question set structure'
    )
  })

  it('rejects set with too few questions', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0] = { questions: [makeQuestion()] }
    expect(() => assertValidQuiz(quiz)).toThrow(
      `Each set must have between ${MIN_QUESTIONS} and ${MAX_QUESTIONS} questions`
    )
  })

  it('rejects set with too many questions', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0] = {
      questions: Array.from({ length: MAX_QUESTIONS + 1 }, () =>
        makeQuestion()
      ),
    }
    expect(() => assertValidQuiz(quiz)).toThrow(
      `Each set must have between ${MIN_QUESTIONS} and ${MAX_QUESTIONS} questions`
    )
  })

  it('rejects null question', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] =
      null as unknown as Quiz['questionSets'][0]['questions'][0]
    expect(() => assertValidQuiz(quiz)).toThrow(
      'Question text must be a non-empty string'
    )
  })

  it('rejects empty question text', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] = makeQuestion({ question: '   ' })
    expect(() => assertValidQuiz(quiz)).toThrow(
      'Question text must be a non-empty string'
    )
  })

  it('rejects non-array options', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] = {
      question: 'Valid?',
      options: 'not-an-array',
      correctAnswer: 0,
    } as unknown as Quiz['questionSets'][0]['questions'][0]
    expect(() => assertValidQuiz(quiz)).toThrow(
      'Question options must be an array'
    )
  })

  it('rejects wrong number of options', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] = makeQuestion({ options: ['A', 'B'] })
    expect(() => assertValidQuiz(quiz)).toThrow(
      `Each question must have exactly ${NUM_OPTIONS_PER_QUESTION} options`
    )
  })

  it('rejects empty option', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] = makeQuestion({
      options: ['A', '', 'C', 'D'],
    })
    expect(() => assertValidQuiz(quiz)).toThrow(
      'Each option must be a non-empty string'
    )
  })

  it('rejects whitespace-only option', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] = makeQuestion({
      options: ['A', '  ', 'C', 'D'],
    })
    expect(() => assertValidQuiz(quiz)).toThrow(
      'Each option must be a non-empty string'
    )
  })

  it('rejects non-integer correctAnswer', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] = makeQuestion({ correctAnswer: 1.5 })
    expect(() => assertValidQuiz(quiz)).toThrow(
      'correctAnswer must be a valid option index'
    )
  })

  it('rejects negative correctAnswer', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] = makeQuestion({ correctAnswer: -1 })
    expect(() => assertValidQuiz(quiz)).toThrow(
      'correctAnswer must be a valid option index'
    )
  })

  it('rejects correctAnswer >= number of options', () => {
    const quiz = makeValidQuiz()
    quiz.questionSets[0].questions[0] = makeQuestion({ correctAnswer: 4 })
    expect(() => assertValidQuiz(quiz)).toThrow(
      'correctAnswer must be a valid option index'
    )
  })
})

describe('updateTextQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when textId is empty', async () => {
    await expect(updateTextQuiz('', makeValidQuiz())).rejects.toThrow(
      'textId is required'
    )
  })

  it('throws on invalid quiz before reaching database', async () => {
    const quiz: Quiz = { questionSets: [] }
    await expect(updateTextQuiz('text-1', quiz)).rejects.toThrow(
      `Quiz must have between ${MIN_QUESTION_SETS} and ${MAX_QUESTION_SETS} question sets`
    )
    expect(_mocks.mockFrom).not.toHaveBeenCalled()
  })

  it('calls supabase with correct arguments for valid quiz', async () => {
    const quiz = makeValidQuiz()
    const mockResult = { id: 'text-1', quiz, quiz_valid: true }
    _mocks.mockSingle.mockResolvedValue({ data: mockResult, error: null })

    const result = await updateTextQuiz('text-1', quiz)

    expect(_mocks.mockFrom).toHaveBeenCalledWith('texts')
    expect(_mocks.mockUpdate).toHaveBeenCalledWith({ quiz, quiz_valid: true })
    expect(_mocks.mockEq).toHaveBeenCalledWith('id', 'text-1')
    expect(result).toEqual(mockResult)
  })

  it('throws when supabase returns an error', async () => {
    const quiz = makeValidQuiz()
    const dbError = { message: 'Row not found' }
    _mocks.mockSingle.mockResolvedValue({ data: null, error: dbError })

    await expect(updateTextQuiz('text-1', quiz)).rejects.toBe(dbError)
  })
})
