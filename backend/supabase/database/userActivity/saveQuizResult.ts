import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export type QuizResultParams = {
  text_id: string
  score: number
}

export async function saveQuizResult(params: QuizResultParams) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: latestActivity, error: fetchError } = await supabase
    .from('user_activity')
    .select('id')
    .eq('user_id', user.id)
    .eq('text_id', params.text_id)
    .order('end_time', { ascending: false, nullsFirst: false })
    .order('start_time', { ascending: false })
    .limit(1)

  logDbQuery({
    table: 'user_activity',
    action: 'SELECT',
    errors: fetchError ? fetchError.message : undefined,
  })

  if (fetchError) {
    throw new Error('Failed to find latest activity')
  }

  const latestId = latestActivity?.[0]?.id
  if (!latestId) return null

  const { data, error } = await supabase
    .from('user_activity')
    .update({ score: params.score })
    .eq('id', latestId)
    .eq('user_id', user.id)
    .select()
    .single()

  logDbQuery({
    table: 'user_activity',
    action: 'UPDATE',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw new Error('Failed to save quiz result')
  }

  return data
}
