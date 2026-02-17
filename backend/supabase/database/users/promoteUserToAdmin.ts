import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

/**
 * Promote a user to admin using the `set_user_role` RPC.
 *
 * This expects a Supabase Postgres function with the signature:
 *   set_user_role(user_id, role)
 */
export async function promoteUserToAdmin(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('set_user_role', {
    target_user_id: targetUserId,
    new_role: 'admin',
  })

  logDbQuery({
    table: 'rpc:set_user_role',
    action: 'PROMOTE',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw new Error(`Failed to promote user: ${error.message}`)
  }
}
