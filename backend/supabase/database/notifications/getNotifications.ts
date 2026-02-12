import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { Notification } from '../../../../frontend/src/types/database'

export async function getNotifications(
  userId: string
): Promise<Notification[]> {
  const { data: result, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  logDbQuery({
    table: 'notifications',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return (result ?? []) as Notification[]
}
