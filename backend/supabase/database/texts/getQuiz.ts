import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { Quiz, QuestionSet } from './types'

export async function getQuiz(textId: string): Promise<QuestionSet> {
  const { data, error } = await supabase
    .from('texts')
    .select('quiz')
    .eq('id', textId)
    .single()

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error || !data?.quiz) {
    throw error ?? new Error('Quiz not found')
  }

  const quiz = data.quiz as Quiz

  if (!Array.isArray(quiz.questionSets) || quiz.questionSets.length !== 5) {
    throw new Error('Invalid quiz format')
  }

  const randomIndex = Math.floor(Math.random() * quiz.questionSets.length)
  return quiz.questionSets[randomIndex]
}
