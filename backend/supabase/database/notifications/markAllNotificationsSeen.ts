import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export async function markAllNotificationsSeen(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ seen: true })
    .eq('user_id', userId)
    .eq('seen', false)

  logDbQuery({
    table: 'notifications',
    action: 'UPDATE',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }
}
