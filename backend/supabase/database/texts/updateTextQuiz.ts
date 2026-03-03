import { supabase } from '../../../../lib/supabase'
import {
  MIN_QUESTION_SETS,
  MAX_QUESTION_SETS,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  MIN_QUESTIONS_SECTIONAL,
  MAX_QUESTIONS_SECTIONAL,
  NUM_OPTIONS_PER_QUESTION,
} from '../../../../lib/quizConstants'
import { logDbQuery } from '../logger'
import type { Quiz, TextRecord } from './types'

/**
 * Server-side quiz validation (defense-in-depth).
 * Throws on the first invalid field. Frontend validateQuiz (frontend/src/utils/quizValidation.ts)
 * collects all errors for a better editing UX; both enforce equivalent structural
 * constraints from lib/quizConstants.ts, though error messages differ.
 */
export function assertValidQuiz(
  quiz: Quiz,
  options?: { sectional?: boolean }
): void {
  const sectional = options?.sectional ?? false
  const minQuestions = sectional ? MIN_QUESTIONS_SECTIONAL : MIN_QUESTIONS
  const maxQuestions = sectional ? MAX_QUESTIONS_SECTIONAL : MAX_QUESTIONS

  if (!quiz?.questionSets || !Array.isArray(quiz.questionSets)) {
    throw new Error('Invalid quiz structure')
  }
  // Sectional texts have one question set per section (no fixed set count limit)
  if (!sectional) {
    if (
      quiz.questionSets.length < MIN_QUESTION_SETS ||
      quiz.questionSets.length > MAX_QUESTION_SETS
    ) {
      throw new Error(
        `Quiz must have between ${MIN_QUESTION_SETS} and ${MAX_QUESTION_SETS} question sets`
      )
    }
  }
  for (const set of quiz.questionSets) {
    if (!Array.isArray(set?.questions)) {
      throw new Error('Invalid question set structure')
    }
    if (
      set.questions.length < minQuestions ||
      set.questions.length > maxQuestions
    ) {
      throw new Error(
        `Each set must have between ${minQuestions} and ${maxQuestions} questions`
      )
    }
    for (const q of set.questions) {
      if (!q || typeof q.question !== 'string' || !q.question.trim()) {
        throw new Error('Question text must be a non-empty string')
      }
      if (!Array.isArray(q.options)) {
        throw new Error('Question options must be an array')
      }
      if (q.options.length !== NUM_OPTIONS_PER_QUESTION) {
        throw new Error(
          `Each question must have exactly ${NUM_OPTIONS_PER_QUESTION} options`
        )
      }
      for (const opt of q.options) {
        if (typeof opt !== 'string' || !opt.trim()) {
          throw new Error('Each option must be a non-empty string')
        }
      }
      if (
        !Number.isInteger(q.correctAnswer) ||
        q.correctAnswer < 0 ||
        q.correctAnswer >= q.options.length
      ) {
        throw new Error('correctAnswer must be a valid option index')
      }
    }
  }
}

export async function updateTextQuiz(
  textId: string,
  quiz: Quiz
): Promise<TextRecord> {
  if (!textId || typeof textId !== 'string') {
    throw new Error('textId is required')
  }

  // Check if the text is sectional to apply the correct quiz constraints
  const { data: textRow, error: fetchError } = await supabase
    .from('texts')
    .select('sectional')
    .eq('id', textId)
    .single()

  if (fetchError) throw fetchError
  assertValidQuiz(quiz, { sectional: textRow?.sectional ?? false })

  const { data: result, error } = await supabase
    .from('texts')
    .update({ quiz, quiz_valid: true })
    .eq('id', textId)
    .select()
    .single()

  logDbQuery({
    table: 'texts',
    action: 'UPDATE (quiz + quiz_valid)',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return result as TextRecord
}
