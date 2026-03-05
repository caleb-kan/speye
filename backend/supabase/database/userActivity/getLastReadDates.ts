import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export async function getLastReadDates(
  userId: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('user_activity')
    .select('text_id, end_time')
    .eq('user_id', userId)
    .not('end_time', 'is', null)
    .order('end_time', { ascending: false })

  logDbQuery({
    table: 'user_activity',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error

  const lastReadDates: Record<string, string> = {}

  data.forEach((row) => {
    if (!row.text_id) return
    const current = lastReadDates[row.text_id]
    if (!current || row.end_time! > current) {
      lastReadDates[row.text_id] = row.end_time!
    }
  })

  return lastReadDates
}
