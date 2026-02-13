import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { TextRecord } from './types'

/**
 * Text record for admin review, omitting fields not needed in the admin panel.
 * Note: authorization is enforced by the admin_approve_text, admin_reject_text,
 * and admin_regenerate_quiz RPCs which verify admin role server-side.
 */
export type AdminReviewText = Omit<
  TextRecord,
  'summary' | 'fiction' | 'complexity' | 'source'
>

export async function getPendingAdminReviews(): Promise<AdminReviewText[]> {
  const { data, error } = await supabase
    .from('texts')
    .select(
      `
      id,
      title,
      content,
      uploaded_at,
      owner_id,
      processing_status,
      quiz_valid,
      quiz,
      llm_decision,
      llm_violation_type,
      admin_decision,
      admin_reviewed_by,
      admin_reviewed_at,
      rejection_reason,
      rejection_stage
    `
    )
    .eq('admin_decision', 'pending')
    .order('uploaded_at', { ascending: false })

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as AdminReviewText[]
}

export async function approveText(
  textId: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_approve_text', {
    p_text_id: textId,
    p_admin_id: adminId,
  })

  logDbQuery({
    table: 'texts',
    action: 'RPC:admin_approve_text',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }
}

export async function rejectText(
  textId: string,
  adminId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_reject_text', {
    p_text_id: textId,
    p_admin_id: adminId,
    p_notes: notes ?? null,
  })

  logDbQuery({
    table: 'texts',
    action: 'RPC:admin_reject_text',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }
}

export async function regenerateQuiz(
  textId: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_regenerate_quiz', {
    p_text_id: textId,
    p_admin_id: adminId,
  })

  logDbQuery({
    table: 'texts',
    action: 'RPC:admin_regenerate_quiz',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }
}
