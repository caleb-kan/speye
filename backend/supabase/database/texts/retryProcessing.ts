import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

/**
 * Retry processing for a failed text.
 * Uses atomic RPC to update status and queue in single transaction.
 */
export async function retryProcessing(textId: string): Promise<void> {
  // Do not allow retrying a text rejected due to content policy.
  const { data: text, error: fetchError } = await supabase
    .from('texts')
    .select('llm_violation_type, rejection_stage')
    .eq('id', textId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  if (text?.rejection_stage === 'process_text' && text?.llm_violation_type) {
    throw new Error(
      'This text cannot be reprocessed because it was rejected for a content policy violation.'
    )
  }

  const { error } = await supabase.rpc('retry_text_processing', {
    p_text_id: textId,
  })

  logDbQuery({
    table: 'texts',
    action: 'RPC:retry_text_processing',
    errors: error ? error.message : undefined,
  })

  if (error) {
    console.error('Error retrying text processing:', error)
    throw error
  }
}
