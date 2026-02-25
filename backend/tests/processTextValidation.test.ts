import { describe, it, expect } from 'vitest'
import {
  MIN_QUESTION_SETS,
  MAX_QUESTION_SETS,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  NUM_OPTIONS_PER_QUESTION,
} from '../../lib/quizConstants'

// These validation functions are duplicated from the process-text edge
// function (backend/supabase/functions/process-text/index.ts) because
// Supabase edge functions must be self-contained and cannot export.
// Note: uses NUM_OPTIONS_PER_QUESTION from lib/quizConstants.ts;
// source uses local constant of the same name and value.
// Keep in sync with the source.

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface QuestionSet {
  questions: QuizQuestion[]
}

interface ErrorResponse {
  status: 'error'
  error: string
  violation_type: string
}

interface ProcessTextResponse {
  status: 'success'
  title: string | null
  questionSets: QuestionSet[]
  fiction: boolean
  summary: string | null
}

function isErrorResponse(data: unknown): data is ErrorResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as ErrorResponse

  return (
    response.status === 'error' &&
    typeof response.error === 'string' &&
    typeof response.violation_type === 'string'
  )
}

function isValidQuestion(q: QuizQuestion): boolean {
  return (
    typeof q.question === 'string' &&
    q.question.trim().length > 0 &&
    Array.isArray(q.options) &&
    q.options.length === NUM_OPTIONS_PER_QUESTION &&
    q.options.every(
      (opt: unknown) =>
        typeof opt === 'string' && (opt as string).trim().length > 0
    ) &&
    Number.isInteger(q.correctAnswer) &&
    q.correctAnswer >= 0 &&
    q.correctAnswer <= NUM_OPTIONS_PER_QUESTION - 1
  )
}

function isValidResponse(data: unknown): data is ProcessTextResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as ProcessTextResponse

  if (response.status !== 'success') return false

  if (response.title !== null && typeof response.title !== 'string')
    return false

  if (!Array.isArray(response.questionSets)) return false
  if (
    response.questionSets.length < MIN_QUESTION_SETS ||
    response.questionSets.length > MAX_QUESTION_SETS
  )
    return false

  if (typeof response.fiction !== 'boolean') return false

  if (!response.fiction) {
    if (typeof response.summary !== 'string' || !response.summary.trim())
      return false
  }

  return response.questionSets.every(
    (set: QuestionSet) =>
      set &&
      Array.isArray(set.questions) &&
      set.questions.length >= MIN_QUESTIONS &&
      set.questions.length <= MAX_QUESTIONS &&
      set.questions.every(isValidQuestion)
  )
}

// --- Test helpers ---

function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    question: 'What is the main topic?',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    ...overrides,
  }
}

function makeSet(questionsOverride?: QuizQuestion[]): QuestionSet {
  return {
    questions:
      questionsOverride ??
      Array.from({ length: MIN_QUESTIONS }, () => makeQuestion()),
  }
}

function makeValidSuccessResponse(
  overrides: Partial<ProcessTextResponse> = {}
): ProcessTextResponse {
  return {
    status: 'success',
    title: 'Test Title',
    questionSets: Array.from({ length: MAX_QUESTION_SETS }, () => makeSet()),
    fiction: false,
    summary: 'This is a valid summary for a non-fiction text.',
    ...overrides,
  }
}

// --- Constant canary ---

describe('quiz constants', () => {
  it('match expected values (update edge function if these change)', () => {
    expect(MIN_QUESTION_SETS).toBe(1)
    expect(MAX_QUESTION_SETS).toBe(5)
    expect(MIN_QUESTIONS).toBe(5)
    expect(MAX_QUESTIONS).toBe(7)
    expect(NUM_OPTIONS_PER_QUESTION).toBe(4)
  })
})

// --- isErrorResponse tests ---

describe('isErrorResponse', () => {
  it('accepts a valid error response', () => {
    expect(
      isErrorResponse({
        status: 'error',
        error: 'Content violates TOS',
        violation_type: 'hate_speech',
      })
    ).toBe(true)
  })

  it('rejects null', () => {
    expect(isErrorResponse(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isErrorResponse(undefined)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isErrorResponse('string')).toBe(false)
  })

  it('rejects when status is not "error"', () => {
    expect(
      isErrorResponse({
        status: 'success',
        error: 'msg',
        violation_type: 'type',
      })
    ).toBe(false)
  })

  it('rejects when error field is not a string', () => {
    expect(
      isErrorResponse({
        status: 'error',
        error: 123,
        violation_type: 'type',
      })
    ).toBe(false)
  })

  it('rejects when violation_type is not a string', () => {
    expect(
      isErrorResponse({
        status: 'error',
        error: 'msg',
        violation_type: null,
      })
    ).toBe(false)
  })

  it('rejects when error field is missing', () => {
    expect(isErrorResponse({ status: 'error', violation_type: 'type' })).toBe(
      false
    )
  })

  it('rejects empty object', () => {
    expect(isErrorResponse({})).toBe(false)
  })
})

// --- isValidQuestion tests ---

describe('isValidQuestion', () => {
  it('accepts a valid question', () => {
    expect(isValidQuestion(makeQuestion())).toBe(true)
  })

  it('accepts correctAnswer at boundary 0', () => {
    expect(isValidQuestion(makeQuestion({ correctAnswer: 0 }))).toBe(true)
  })

  it('accepts correctAnswer at boundary 3', () => {
    expect(isValidQuestion(makeQuestion({ correctAnswer: 3 }))).toBe(true)
  })

  it('rejects correctAnswer of -1', () => {
    expect(isValidQuestion(makeQuestion({ correctAnswer: -1 }))).toBe(false)
  })

  it('rejects correctAnswer of 4', () => {
    expect(isValidQuestion(makeQuestion({ correctAnswer: 4 }))).toBe(false)
  })

  it('rejects non-integer correctAnswer (1.5)', () => {
    expect(isValidQuestion(makeQuestion({ correctAnswer: 1.5 }))).toBe(false)
  })

  it('rejects NaN correctAnswer', () => {
    expect(isValidQuestion(makeQuestion({ correctAnswer: NaN }))).toBe(false)
  })

  it('rejects string correctAnswer', () => {
    expect(
      isValidQuestion(
        makeQuestion({
          correctAnswer: '2' as unknown as number,
        })
      )
    ).toBe(false)
  })

  it('rejects wrong number of options (3)', () => {
    expect(isValidQuestion(makeQuestion({ options: ['A', 'B', 'C'] }))).toBe(
      false
    )
  })

  it('rejects wrong number of options (5)', () => {
    expect(
      isValidQuestion(makeQuestion({ options: ['A', 'B', 'C', 'D', 'E'] }))
    ).toBe(false)
  })

  it('rejects non-string option', () => {
    expect(
      isValidQuestion(
        makeQuestion({
          options: ['A', 'B', 'C', 42] as unknown as string[],
        })
      )
    ).toBe(false)
  })

  it('rejects non-string question', () => {
    expect(
      isValidQuestion(makeQuestion({ question: 123 as unknown as string }))
    ).toBe(false)
  })

  it('rejects non-array options', () => {
    expect(
      isValidQuestion(
        makeQuestion({ options: 'not-array' as unknown as string[] })
      )
    ).toBe(false)
  })

  it('rejects empty string question', () => {
    expect(isValidQuestion(makeQuestion({ question: '' }))).toBe(false)
  })

  it('rejects whitespace-only question', () => {
    expect(isValidQuestion(makeQuestion({ question: '   ' }))).toBe(false)
  })

  it('rejects empty string option', () => {
    expect(
      isValidQuestion(makeQuestion({ options: ['A', '', 'C', 'D'] }))
    ).toBe(false)
  })

  it('rejects whitespace-only option', () => {
    expect(
      isValidQuestion(makeQuestion({ options: ['A', 'B', '  ', 'D'] }))
    ).toBe(false)
  })

  it('rejects empty options array', () => {
    expect(isValidQuestion(makeQuestion({ options: [] }))).toBe(false)
  })
})

// --- isValidResponse tests ---

describe('isValidResponse', () => {
  it('accepts a valid non-fiction response', () => {
    expect(isValidResponse(makeValidSuccessResponse())).toBe(true)
  })

  it('accepts a valid fiction response with null summary', () => {
    expect(
      isValidResponse(
        makeValidSuccessResponse({ fiction: true, summary: null })
      )
    ).toBe(true)
  })

  it('accepts a valid fiction response with string summary (nulled out later)', () => {
    expect(
      isValidResponse(
        makeValidSuccessResponse({
          fiction: true,
          summary: 'Fiction can have summary, handler nulls it out',
        })
      )
    ).toBe(true)
  })

  it('accepts null title', () => {
    expect(isValidResponse(makeValidSuccessResponse({ title: null }))).toBe(
      true
    )
  })

  it('rejects null', () => {
    expect(isValidResponse(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isValidResponse('string')).toBe(false)
  })

  it('rejects when status is "error"', () => {
    expect(
      isValidResponse({ ...makeValidSuccessResponse(), status: 'error' })
    ).toBe(false)
  })

  it('accepts when questionSets has count within range (1)', () => {
    const response = makeValidSuccessResponse()
    response.questionSets = response.questionSets.slice(0, 1)
    expect(isValidResponse(response)).toBe(true)
  })

  it('rejects when questionSets is empty (0)', () => {
    const response = makeValidSuccessResponse()
    response.questionSets = []
    expect(isValidResponse(response)).toBe(false)
  })

  it('rejects when questionSets exceeds max (6)', () => {
    const response = makeValidSuccessResponse()
    response.questionSets.push(makeSet())
    expect(isValidResponse(response)).toBe(false)
  })

  it('rejects when a question set has too few questions', () => {
    const response = makeValidSuccessResponse()
    response.questionSets[0] = {
      questions: [makeQuestion(), makeQuestion()],
    }
    expect(isValidResponse(response)).toBe(false)
  })

  it('accepts when a question set has max questions', () => {
    const response = makeValidSuccessResponse()
    response.questionSets[0] = makeSet(
      Array.from({ length: MAX_QUESTIONS }, () => makeQuestion())
    )
    expect(isValidResponse(response)).toBe(true)
  })

  it('rejects when a question set exceeds max questions', () => {
    const response = makeValidSuccessResponse()
    response.questionSets[0] = makeSet(
      Array.from({ length: MAX_QUESTIONS + 1 }, () => makeQuestion())
    )
    expect(isValidResponse(response)).toBe(false)
  })

  it('rejects when fiction is not a boolean', () => {
    expect(
      isValidResponse(
        makeValidSuccessResponse({
          fiction: 'false' as unknown as boolean,
        })
      )
    ).toBe(false)
  })

  it('rejects non-fiction with null summary', () => {
    expect(
      isValidResponse(
        makeValidSuccessResponse({ fiction: false, summary: null })
      )
    ).toBe(false)
  })

  it('rejects non-fiction with empty string summary', () => {
    expect(
      isValidResponse(makeValidSuccessResponse({ fiction: false, summary: '' }))
    ).toBe(false)
  })

  it('rejects non-fiction with whitespace-only summary', () => {
    expect(
      isValidResponse(
        makeValidSuccessResponse({ fiction: false, summary: '   ' })
      )
    ).toBe(false)
  })

  it('rejects when title is a non-null non-string', () => {
    expect(
      isValidResponse(
        makeValidSuccessResponse({
          title: 123 as unknown as string,
        })
      )
    ).toBe(false)
  })

  it('rejects when questionSets is not an array', () => {
    expect(
      isValidResponse({
        ...makeValidSuccessResponse(),
        questionSets: 'not-array',
      })
    ).toBe(false)
  })

  it('rejects when a question has invalid options count', () => {
    const response = makeValidSuccessResponse()
    response.questionSets[0].questions[0] = makeQuestion({
      options: ['A', 'B'],
    })
    expect(isValidResponse(response)).toBe(false)
  })

  it('rejects when a question has invalid correctAnswer', () => {
    const response = makeValidSuccessResponse()
    response.questionSets[0].questions[0] = makeQuestion({
      correctAnswer: 5,
    })
    expect(isValidResponse(response)).toBe(false)
  })

  it('rejects when a question set is null', () => {
    const response = makeValidSuccessResponse()
    response.questionSets[0] = null as unknown as QuestionSet
    expect(isValidResponse(response)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isValidResponse(undefined)).toBe(false)
  })

  it('rejects when questionSets property is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { questionSets: _omit, ...rest } = makeValidSuccessResponse()
    expect(isValidResponse(rest)).toBe(false)
  })

  it('rejects when fiction property is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fiction: _omit, ...rest } = makeValidSuccessResponse()
    expect(isValidResponse(rest)).toBe(false)
  })

  it('rejects when a question has empty string question text', () => {
    const response = makeValidSuccessResponse()
    response.questionSets[0].questions[0] = makeQuestion({ question: '' })
    expect(isValidResponse(response)).toBe(false)
  })

  it('rejects when a question has empty string option', () => {
    const response = makeValidSuccessResponse()
    response.questionSets[0].questions[0] = makeQuestion({
      options: ['A', '', 'C', 'D'],
    })
    expect(isValidResponse(response)).toBe(false)
  })
})
