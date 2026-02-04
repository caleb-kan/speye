import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

/**
 * Retry processing for a failed text.
 * Uses atomic RPC to update status and queue in single transaction.
 */
export async function retryProcessing(textId: string): Promise<void> {
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
