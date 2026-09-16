import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { LeaderboardEntry } from '../../../redis/types'

/** Reconstruct a public text leaderboard from saved attempts when Redis is unavailable. */
export async function getTextLeaderboard(
  textId: string,
  currentUserId?: string
): Promise<{ top: LeaderboardEntry[]; currentUser: LeaderboardEntry | null }> {
  if (!textId) throw new Error('Text ID is required')
  const { data, error } = await supabase.rpc('get_text_leaderboard', {
    p_text_id: textId,
    p_current_user_id: currentUserId ?? null,
  })
  logDbQuery({
    table: 'rpc:get_text_leaderboard',
    action: 'SELECT public leaderboard',
    errors: error?.message,
  })
  if (error) throw error
  return data ?? { top: [], currentUser: null }
}
