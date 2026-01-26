import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export type OwnerFilter = { type: 'user'; userId: string } | { type: 'public' }

export async function getLibraryTexts(owner: OwnerFilter) {
  let query = supabase
    .from('texts')
    .select('*')
    .order('uploaded_at', { ascending: false })

  if (owner.type === 'user') {
    query = query.eq('owner_id', owner.userId)
  } else {
    query = query.is('owner_id', null)
  }

  const { data: result, error } = await query

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return result
}
