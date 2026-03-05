import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

const RECENT_DAYS = 7

export async function getRecentlyQuizzedTextIds(
  userId: string
): Promise<string[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS)

  const { data, error } = await supabase
    .from('user_activity')
    .select('text_id')
    .eq('user_id', userId)
    .not('score', 'is', null)
    .gte('end_time', cutoff.toISOString())

  logDbQuery({
    table: 'user_activity',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error

  return [...new Set(data.map((row) => row.text_id).filter(Boolean))]
}
