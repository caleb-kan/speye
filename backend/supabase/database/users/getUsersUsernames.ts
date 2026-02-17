import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export type UsernameRecord = {
  id: string
  username: string | null
}

export async function getUsersUsernames(): Promise<UsernameRecord[]> {
  const { data, error } = await supabase.from('users').select('id, username')

  logDbQuery({
    table: 'users',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as UsernameRecord[]
}
