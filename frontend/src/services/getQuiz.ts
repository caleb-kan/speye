import { supabase } from '../../../lib/supabase'
import type { Quiz, QuestionSet } from '../types/database'

/**
 * Fetches a quiz for a given text and returns a random question set.
 * Each quiz contains 5 question sets, and one is randomly selected per session.
 */
export async function getQuiz(textId: string): Promise<QuestionSet> {
  const { data, error } = await supabase
    .from('texts')
    .select('quiz')
    .eq('id', textId)
    .single()

  if (error) {
    console.error('Failed to fetch quiz:', error.message)
    throw new Error('Failed to load quiz')
  }

  if (!data?.quiz) {
    throw new Error('No quiz available for this text')
  }

  const quiz = data.quiz as Quiz

  if (!Array.isArray(quiz.questionSets) || quiz.questionSets.length !== 5) {
    throw new Error('Invalid quiz format')
  }

  const randomIndex = Math.floor(Math.random() * quiz.questionSets.length)
  return quiz.questionSets[randomIndex]
}
