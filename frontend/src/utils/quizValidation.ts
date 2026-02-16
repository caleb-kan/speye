import type { Quiz } from '../types/database'
import {
  NUM_QUESTION_SETS,
  NUM_QUESTIONS,
  NUM_OPTIONS_PER_QUESTION,
  OPTION_LABELS,
} from '../constants/quiz'

const CORRECT_ANSWER_RANGE = OPTION_LABELS.join(', ')

const MALFORMED_ERROR = 'Quiz structure is invalid. Try regenerating the quiz.'

export function validateQuiz(quiz: Quiz): string[] {
  const errors: string[] = []

  if (!quiz?.questionSets || !Array.isArray(quiz.questionSets)) {
    return [MALFORMED_ERROR]
  }

  if (quiz.questionSets.length !== NUM_QUESTION_SETS) {
    errors.push(`Quiz must have exactly ${NUM_QUESTION_SETS} question sets`)
    return errors
  }

  for (let s = 0; s < quiz.questionSets.length; s++) {
    const set = quiz.questionSets[s]

    if (!set?.questions || !Array.isArray(set.questions)) {
      errors.push(`Set ${s + 1}: ${MALFORMED_ERROR}`)
      continue
    }

    if (set.questions.length !== NUM_QUESTIONS) {
      errors.push(`Set ${s + 1}: must have exactly ${NUM_QUESTIONS} questions`)
      continue
    }

    for (let q = 0; q < set.questions.length; q++) {
      const question = set.questions[q]
      const label = `Set ${s + 1}, Question ${q + 1}`

      if (!question || typeof question.question !== 'string') {
        errors.push(`${label}: ${MALFORMED_ERROR}`)
        continue
      }

      if (!question.question.trim()) {
        errors.push(`${label}: question text is empty`)
      }

      if (!Array.isArray(question.options)) {
        errors.push(`${label}: ${MALFORMED_ERROR}`)
        continue
      }

      if (question.options.length !== NUM_OPTIONS_PER_QUESTION) {
        errors.push(
          `${label}: must have exactly ${NUM_OPTIONS_PER_QUESTION} options`
        )
        continue
      }

      for (let o = 0; o < question.options.length; o++) {
        if (typeof question.options[o] !== 'string') {
          errors.push(`${label}: option ${OPTION_LABELS[o]} is invalid`)
          continue
        }
        if (!question.options[o].trim()) {
          errors.push(`${label}: option ${OPTION_LABELS[o]} is empty`)
        }
      }

      if (
        !Number.isInteger(question.correctAnswer) ||
        question.correctAnswer < 0 ||
        question.correctAnswer >= question.options.length
      ) {
        errors.push(`${label}: correct answer must be ${CORRECT_ANSWER_RANGE}`)
      }
    }
  }

  return errors
}

export function hasQuizChanged(original: Quiz, current: Quiz): boolean {
  return JSON.stringify(original) !== JSON.stringify(current)
}
