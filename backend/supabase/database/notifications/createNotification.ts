import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { NotificationType } from './types'

export async function createNotification(
  userId: string,
  message: string,
  type: NotificationType,
  link?: string
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    message,
    type,
    ...(link !== undefined && { link }),
  })

  logDbQuery({
    table: 'notifications',
    action: 'INSERT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }
}
