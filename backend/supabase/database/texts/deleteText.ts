import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

/**
 * Delete a text and clean up any orphaned queue messages.
 * Uses atomic RPC to prevent orphaned messages in process_text or validate_quiz queues.
 */
export async function deleteText(textId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_text_with_cleanup', {
    p_text_id: textId,
  })

  logDbQuery({
    table: 'texts',
    action: 'RPC:delete_text_with_cleanup',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }
}
