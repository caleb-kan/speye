import { supabase } from '../../../../lib/supabase'
import {
  NUM_QUESTION_SETS,
  NUM_QUESTIONS,
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
export function assertValidQuiz(quiz: Quiz): void {
  if (!quiz?.questionSets || !Array.isArray(quiz.questionSets)) {
    throw new Error('Invalid quiz structure')
  }
  if (quiz.questionSets.length !== NUM_QUESTION_SETS) {
    throw new Error(`Quiz must have exactly ${NUM_QUESTION_SETS} question sets`)
  }
  for (const set of quiz.questionSets) {
    if (!Array.isArray(set?.questions)) {
      throw new Error('Invalid question set structure')
    }
    if (set.questions.length !== NUM_QUESTIONS) {
      throw new Error(`Each set must have exactly ${NUM_QUESTIONS} questions`)
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

  assertValidQuiz(quiz)

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
