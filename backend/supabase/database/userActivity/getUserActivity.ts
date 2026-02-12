import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export interface ActivitySession {
  id: string
  text_id: string
  wpm: number
  mode: 'standard' | 'adaptive'
  score: number | null
  start_time: string | null
  end_time: string | null
  text: {
    title: string
    fiction: boolean
    complexity: number
  } | null
}

export async function getUserActivity(
  userId: string
): Promise<ActivitySession[]> {
  const { data, error } = await supabase
    .from('user_activity')
    .select(
      `
      id,
      text_id,
      wpm,
      score,
      start_time,
      end_time,
      mode,
      text:texts (
        title,
        fiction,
        complexity
      )
    `
    )
    .eq('user_id', userId)
    .order('end_time', { ascending: false, nullsFirst: false })

  logDbQuery({
    table: 'user_activity',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  return data as unknown as ActivitySession[]
}
