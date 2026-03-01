import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { UsernameRecord } from './getUsersUsernames'

export async function getUsernamesByIds(
  userIds: string[]
): Promise<UsernameRecord[]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds)

  logDbQuery({
    table: 'users',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error

  return (data ?? []) as UsernameRecord[]
}
