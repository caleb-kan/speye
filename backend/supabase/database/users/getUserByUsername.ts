import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export type UserByUsernameRecord = {
  id: string
}

export async function getUserByUsername(
  username: string
): Promise<UserByUsernameRecord | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .ilike('username', username)
    .maybeSingle()

  logDbQuery({
    table: 'users',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return data as UserByUsernameRecord | null
}
