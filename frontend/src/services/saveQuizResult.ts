import { supabase } from '../../../lib/supabase'

export type QuizResultParams = {
  text_id: string
  score: number
}

export async function saveQuizResult(params: QuizResultParams) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  const { data: latestActivity, error: fetchError } = await supabase
    .from('user_activity')
    .select('id')
    .eq('user_id', user.id)
    .eq('text_id', params.text_id)
    .order('end_time', { ascending: false, nullsFirst: false })
    .order('start_time', { ascending: false })
    .limit(1)

  if (fetchError) {
    throw new Error('Failed to find latest activity')
  }

  const latestId = latestActivity?.[0]?.id
  if (!latestId) {
    throw new Error('No activity found to update')
  }

  const { data, error } = await supabase
    .from('user_activity')
    .update({ score: params.score })
    .eq('id', latestId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to save quiz result')
  }

  return data
}
