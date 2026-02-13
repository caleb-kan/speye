import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

/**
 * Call the leaderboard edge function to update the Redis cache
 * after a quiz result is saved to Supabase.
 */
export async function updateLeaderboardCache(
  textId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.functions.invoke('leaderboard', {
    body: { text_id: textId, user_id: userId, action: 'update' },
  })

  logDbQuery({
    table: 'edge:leaderboard',
    action: 'UPDATE cache',
  })

  if (error) {
    throw new Error(`Leaderboard cache update failed: ${error.message}`)
  }
}
