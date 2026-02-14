import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export type UserRecord = {
  id: string
}

export async function getUsers(): Promise<UserRecord[]> {
  const { data, error } = await supabase.from('users').select('id')

  logDbQuery({
    table: 'users',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as UserRecord[]
}
