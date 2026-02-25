import { describe, it, expect } from 'vitest'
import { validateQuiz, hasQuizChanged } from '../../utils/quizValidation'
import type { Quiz } from '../../types/database'
import {
  MIN_QUESTION_SETS,
  MAX_QUESTION_SETS,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  NUM_OPTIONS_PER_QUESTION,
} from '../../constants/quiz'

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

const makeValidQuiz = (
  numSets = MAX_QUESTION_SETS,
  numQuestions = MIN_QUESTIONS
): Quiz => ({
  questionSets: Array.from({ length: numSets }, () => ({
    questions: Array.from({ length: numQuestions }, () => makeQuestion()),
  })),
})

/** Creates a valid quiz with one question overridden in a specific set */
const makeQuizWithQuestion = (
  setIndex: number,
  questionIndex: number,
  questionOverrides: Parameters<typeof makeQuestion>[0]
): Quiz => {
  const quiz = makeValidQuiz()
  quiz.questionSets[setIndex].questions[questionIndex] =
    makeQuestion(questionOverrides)
  return quiz
}

describe('validateQuiz', () => {
  describe('structural validation', () => {
    it('returns no errors for a structurally valid quiz', () => {
      expect(validateQuiz(makeValidQuiz())).toEqual([])
    })

    it('accepts a quiz with 1 set (minimum)', () => {
      expect(validateQuiz(makeValidQuiz(MIN_QUESTION_SETS))).toEqual([])
    })

    it('accepts a quiz with max sets', () => {
      expect(validateQuiz(makeValidQuiz(MAX_QUESTION_SETS))).toEqual([])
    })

    it('accepts sets with different valid question counts', () => {
      const quiz: Quiz = {
        questionSets: [
          {
            questions: Array.from({ length: MIN_QUESTIONS }, () =>
              makeQuestion()
            ),
          },
          {
            questions: Array.from({ length: MAX_QUESTIONS }, () =>
              makeQuestion()
            ),
          },
          {
            questions: Array.from({ length: MIN_QUESTIONS + 1 }, () =>
              makeQuestion()
            ),
          },
        ],
      }
      expect(validateQuiz(quiz)).toEqual([])
    })

    it('rejects empty quiz (no sets)', () => {
      const quiz: Quiz = { questionSets: [] }
      const errors = validateQuiz(quiz)
      expect(errors).toEqual([
        `Quiz must have between ${MIN_QUESTION_SETS} and ${MAX_QUESTION_SETS} question sets`,
      ])
    })

    it('rejects quiz with too many sets', () => {
      const quiz = makeValidQuiz(MAX_QUESTION_SETS + 1)
      const errors = validateQuiz(quiz)
      expect(errors).toEqual([
        `Quiz must have between ${MIN_QUESTION_SETS} and ${MAX_QUESTION_SETS} question sets`,
      ])
    })

    it('returns user-friendly error for null questionSets', () => {
      const quiz = { questionSets: null } as unknown as Quiz
      const errors = validateQuiz(quiz)
      expect(errors).toEqual([
        'Quiz structure is invalid. Try regenerating the quiz.',
      ])
    })

    it('returns user-friendly error for undefined questionSets', () => {
      const quiz = {} as unknown as Quiz
      const errors = validateQuiz(quiz)
      expect(errors).toEqual([
        'Quiz structure is invalid. Try regenerating the quiz.',
      ])
    })

    it('returns user-friendly error for malformed question set', () => {
      const quiz = makeValidQuiz()
      quiz.questionSets[1] = {
        questions: null,
      } as unknown as Quiz['questionSets'][0]
      const errors = validateQuiz(quiz)
      expect(errors).toContain(
        'Set 2: Quiz structure is invalid. Try regenerating the quiz.'
      )
    })

    it('returns user-friendly error for malformed question', () => {
      const quiz = makeValidQuiz()
      quiz.questionSets[0].questions[0] =
        null as unknown as Quiz['questionSets'][0]['questions'][0]
      const errors = validateQuiz(quiz)
      expect(errors).toContain(
        'Set 1, Question 1: Quiz structure is invalid. Try regenerating the quiz.'
      )
    })

    it('accepts set with minimum questions', () => {
      expect(validateQuiz(makeValidQuiz(1, MIN_QUESTIONS))).toEqual([])
    })

    it('accepts set with maximum questions', () => {
      expect(validateQuiz(makeValidQuiz(1, MAX_QUESTIONS))).toEqual([])
    })

    it('rejects set with too few questions', () => {
      const quiz: Quiz = {
        questionSets: [
          {
            questions: Array.from({ length: MIN_QUESTIONS - 1 }, () =>
              makeQuestion()
            ),
          },
        ],
      }
      const errors = validateQuiz(quiz)
      expect(errors).toEqual([
        `Set 1: must have between ${MIN_QUESTIONS} and ${MAX_QUESTIONS} questions`,
      ])
    })

    it('rejects set with too many questions', () => {
      const quiz: Quiz = {
        questionSets: [
          {
            questions: Array.from({ length: MAX_QUESTIONS + 1 }, () =>
              makeQuestion()
            ),
          },
        ],
      }
      const errors = validateQuiz(quiz)
      expect(errors).toEqual([
        `Set 1: must have between ${MIN_QUESTIONS} and ${MAX_QUESTIONS} questions`,
      ])
    })

    it('rejects question with wrong number of options', () => {
      const quiz = makeValidQuiz()
      quiz.questionSets[0].questions[0] = makeQuestion({
        options: ['A', 'B'],
      })
      const errors = validateQuiz(quiz)
      expect(errors).toEqual([
        `Set 1, Question 1: must have exactly ${NUM_OPTIONS_PER_QUESTION} options`,
      ])
    })
  })

  describe('content validation', () => {
    it('detects empty question text', () => {
      const quiz = makeQuizWithQuestion(0, 0, { question: '  ' })
      const errors = validateQuiz(quiz)
      expect(errors).toContain('Set 1, Question 1: question text is empty')
    })

    it('detects empty option', () => {
      const quiz = makeQuizWithQuestion(0, 0, {
        options: ['A', '', 'C', 'D'],
      })
      const errors = validateQuiz(quiz)
      expect(errors).toContain('Set 1, Question 1: option B is empty')
    })

    it('detects multiple empty options', () => {
      const quiz = makeQuizWithQuestion(0, 0, {
        options: ['', '', 'C', ''],
      })
      const errors = validateQuiz(quiz)
      expect(errors).toContain('Set 1, Question 1: option A is empty')
      expect(errors).toContain('Set 1, Question 1: option B is empty')
      expect(errors).toContain('Set 1, Question 1: option D is empty')
    })

    it('detects whitespace-only options', () => {
      const quiz = makeQuizWithQuestion(0, 0, {
        options: ['A', '   ', 'C', 'D'],
      })
      const errors = validateQuiz(quiz)
      expect(errors).toContain('Set 1, Question 1: option B is empty')
    })

    it('detects correctAnswer out of range (negative)', () => {
      const quiz = makeQuizWithQuestion(0, 0, {
        correctAnswer: -1,
      })
      const errors = validateQuiz(quiz)
      expect(errors).toContain(
        'Set 1, Question 1: correct answer must be A, B, C, D'
      )
    })

    it('detects correctAnswer out of range (too large)', () => {
      const quiz = makeQuizWithQuestion(0, 0, {
        correctAnswer: 4,
      })
      const errors = validateQuiz(quiz)
      expect(errors).toContain(
        'Set 1, Question 1: correct answer must be A, B, C, D'
      )
    })

    it('detects non-integer correctAnswer', () => {
      const quiz = makeQuizWithQuestion(0, 0, {
        correctAnswer: 1.5,
      })
      const errors = validateQuiz(quiz)
      expect(errors).toContain(
        'Set 1, Question 1: correct answer must be A, B, C, D'
      )
    })

    it('reports errors with correct set and question labels', () => {
      const quiz = makeQuizWithQuestion(1, 3, { question: '' })
      const errors = validateQuiz(quiz)
      expect(errors).toContain('Set 2, Question 4: question text is empty')
    })

    it('collects multiple errors across sets and questions', () => {
      const quiz = makeValidQuiz()
      quiz.questionSets[0].questions[0] = makeQuestion({
        question: '',
      })
      quiz.questionSets[1].questions[2] = makeQuestion({
        correctAnswer: 99,
      })
      const errors = validateQuiz(quiz)
      expect(errors.length).toBeGreaterThanOrEqual(2)
      expect(errors).toContain('Set 1, Question 1: question text is empty')
      expect(errors).toContain(
        'Set 2, Question 3: correct answer must be A, B, C, D'
      )
    })
  })
})

describe('hasQuizChanged', () => {
  it('returns false for identical quizzes', () => {
    const quiz = makeValidQuiz()
    expect(hasQuizChanged(quiz, structuredClone(quiz))).toBe(false)
  })

  it('returns true when question text changes', () => {
    const original = makeValidQuiz()
    const modified = structuredClone(original)
    modified.questionSets[0].questions[0].question = 'Changed'
    expect(hasQuizChanged(original, modified)).toBe(true)
  })

  it('returns true when option changes', () => {
    const original = makeValidQuiz()
    const modified = structuredClone(original)
    modified.questionSets[0].questions[0].options[0] = 'Changed'
    expect(hasQuizChanged(original, modified)).toBe(true)
  })

  it('returns true when correctAnswer changes', () => {
    const original = makeValidQuiz()
    const modified = structuredClone(original)
    modified.questionSets[0].questions[0].correctAnswer = 0
    expect(hasQuizChanged(original, modified)).toBe(true)
  })

  it('returns false for same reference', () => {
    const quiz = makeValidQuiz()
    expect(hasQuizChanged(quiz, quiz)).toBe(false)
  })
})
