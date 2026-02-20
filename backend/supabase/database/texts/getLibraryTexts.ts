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
      'id, title, preview, fiction, complexity, uploaded_at, owner_id, quiz, source, processing_status, quiz_valid, has_summary, llm_decision, llm_violation_type, admin_decision, rejection_reason, rejection_stage, admin_reviewed_by, admin_reviewed_at'
    )
    .order('uploaded_at', { ascending: false })

  if (owner.type === 'user') {
    // Hide TOS violations from the user's own library (they'll be deleted by admin)
    query = query
      .eq('owner_id', owner.userId)
      .or(
        'rejection_stage.is.null,rejection_stage.neq.process_text,llm_violation_type.is.null'
      )
  } else {
    // Public text visibility rules:
    // 1. Explicitly admin-approved texts
    // 2. Legacy texts with no admin_decision (pre-moderation) that finished processing
    // 3. Pending admin review texts that passed LLM and quiz validation
    query = query
      .is('owner_id', null)
      .or(
        'admin_decision.eq.approved,and(admin_decision.is.null,processing_status.eq.completed),and(admin_decision.eq.pending,llm_decision.eq.approved,processing_status.eq.completed,quiz_valid.eq.true)'
      )
  }

  const { data, error } = await query

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as TextPreview[]
}
