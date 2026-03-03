import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { TextRecord } from '../texts/types'

/**
 * Text record for admin review, omitting fields not needed in the admin panel.
 * Note: authorization is enforced by the admin_approve_text, admin_reject_text,
 * and admin_regenerate_quiz RPCs which verify admin role server-side.
 */
export type AdminReviewText = Omit<
  TextRecord,
  'summary' | 'fiction' | 'complexity' | 'source'
> & {
  owner_username: string | null
}

export type AdminStats = {
  totalTexts: number
  publicTexts: number
  privateTexts: number
  pendingTexts: number
  activeUsers: number
  rejectionRate: string
}

export type UserTrendData = {
  activity_date: string
  active_count: number
}

export interface QuizTrendPoint {
  date: string
  avg_accuracy: number | null
  quiz_count: number
}

export interface AdminQuizStats {
  global_avg_accuracy: number
  total_quizzes_taken: number
  trend: QuizTrendPoint[]
}

export interface WpmBucket {
  range: string
  count: number
}

export interface WpmStats {
  recent: { avg_wpm: number; distribution: WpmBucket[] }
  all_time: { avg_wpm: number; distribution: WpmBucket[] }
}

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
      rejection_stage,
      users!texts_owner_id_fkey(username)
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

  return (data ?? []).map((row) => {
    const { users, ...rest } = row as typeof row & {
      users: { username: string } | null
    }
    return { ...rest, owner_username: users?.username ?? null }
  })
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

export async function deleteTosViolation(
  textId: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_tos_violation', {
    p_text_id: textId,
    p_admin_id: adminId,
  })

  logDbQuery({
    table: 'texts',
    action: 'RPC:admin_delete_tos_violation',
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

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('get_admin_stats')

  logDbQuery({
    table: 'rpc',
    action: 'RPC:get_admin_stats',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  const stats: AdminStats | null = data

  if (!stats) {
    throw new Error('No data returned from get_admin_stats')
  }

  return stats
}

export async function getUserTrend(): Promise<UserTrendData[]> {
  const { data, error } = await supabase.rpc('get_active_users_trend')

  logDbQuery({
    table: 'rpc',
    action: 'RPC:get_active_users_trend',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getAdminQuizStats(): Promise<AdminQuizStats> {
  const { data, error } = await supabase.rpc('get_admin_quiz_stats')

  logDbQuery({
    table: 'rpc',
    action: 'RPC:get_admin_quiz_stats',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return data as AdminQuizStats
}

export async function getAdminWpmDistribution(): Promise<WpmStats> {
  const { data, error } = await supabase.rpc('get_admin_wpm_distribution')

  logDbQuery({
    table: 'rpc',
    action: 'RPC:get_admin_wpm_distribution',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return data as WpmStats
}
