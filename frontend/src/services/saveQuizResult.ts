import { supabase } from '../../../lib/supabase'

export type QuizResultParams = {
  text_id: string
  wpm: number
  score: number
}

export async function saveQuizResult(params: QuizResultParams) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('user_activity')
    .insert([
      {
        user_id: user.id,
        text_id: params.text_id,
        wpm: params.wpm,
        score: params.score,
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error('Failed to save quiz result')
  }

  return data
}
