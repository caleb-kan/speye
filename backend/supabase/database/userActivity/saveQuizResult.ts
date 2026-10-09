import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import { MAX_QUIZ_SCORE } from '../../../../lib/quizConstants'

export type QuizResultParams = {
  text_id: string
  score: number
  activity_id?: string
  completed_at?: string
}

export async function saveQuizResult(
  params: QuizResultParams,
  expectedUserId?: string
) {
  if (
    !Number.isFinite(params.score) ||
    params.score < 0 ||
    params.score > MAX_QUIZ_SCORE
  ) {
    throw new Error(
      `Score must be a finite number between 0 and ${MAX_QUIZ_SCORE}`
    )
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) throw authError
  if (!user || (expectedUserId && user.id !== expectedUserId)) return null

  let activityQuery = supabase
    .from('user_activity')
    .select('id')
    .eq('user_id', user.id)
    .eq('text_id', params.text_id)

  if (params.activity_id) {
    activityQuery = activityQuery.eq('id', params.activity_id)
  } else if (params.completed_at) {
    activityQuery = activityQuery.lte('end_time', params.completed_at)
  }

  const { data: latestActivity, error: fetchError } = await activityQuery
    .order('end_time', { ascending: false, nullsFirst: false })
    .order('start_time', { ascending: false })
    .limit(1)

  logDbQuery({
    table: 'user_activity',
    action: 'SELECT',
    errors: fetchError ? fetchError.message : undefined,
  })

  if (fetchError) {
    throw new Error(`Failed to find latest activity: ${fetchError.message}`)
  }

  const latestId = latestActivity?.[0]?.id
  if (!latestId) return null

  const { data, error } = await supabase
    .from('user_activity')
    .update({ score: params.score })
    .eq('id', latestId)
    .eq('user_id', user.id)
    .eq('text_id', params.text_id)
    .select()
    .single()

  logDbQuery({
    table: 'user_activity',
    action: 'UPDATE',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw new Error(`Failed to save quiz result: ${error.message}`)
  }

  return data
}
