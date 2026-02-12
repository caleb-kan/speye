import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export async function markNotificationSeen(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ seen: true })
    .eq('id', notificationId)

  logDbQuery({
    table: 'notifications',
    action: 'UPDATE',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }
}
