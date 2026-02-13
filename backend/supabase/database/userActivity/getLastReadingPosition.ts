import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export async function getLastReadingPosition(
  userId: string,
  textId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('user_activity')
    .select('progress_index')
    .eq('user_id', userId)
    .eq('text_id', textId)
    .order('end_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  logDbQuery({
    table: 'user_activity',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  if (!data) return null

  return data.progress_index
}
