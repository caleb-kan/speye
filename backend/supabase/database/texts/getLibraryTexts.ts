import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { TextPreview } from '../../../../frontend/src/types/database'

export type OwnerFilter = { type: 'user'; userId: string } | { type: 'public' }

export async function getLibraryTexts(
  owner: OwnerFilter
): Promise<TextPreview[]> {
  let query = supabase
    .from('texts')
    .select(
      'id, title, preview, fiction, complexity, uploaded_at, owner_id, quiz, category, source, processing_status, quiz_valid, has_summary'
    )
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

  return result as TextPreview[]
}
