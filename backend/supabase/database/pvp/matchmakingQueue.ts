import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import { keepaliveFetch } from './keepaliveFetch'
import type { MatchmakeResult } from './types'

/**
 * Calls the `matchmake` RPC which either matches the user with an opponent
 * (returning the game ID), places them in the queue, reports they are
 * already in a game, or returns an error (e.g. queue cooldown active).
 */
export async function matchmake(
  userId: string,
  elo: number
): Promise<MatchmakeResult> {
  if (!Number.isFinite(elo) || elo < 0) {
    throw new Error('elo must be a finite non-negative number')
  }

  const { data, error } = await supabase.rpc('matchmake', {
    p_user_id: userId,
    p_elo: elo,
  })

  logDbQuery({
    table: 'matchmaking_queue',
    action: 'RPC:matchmake',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  if (!isValidMatchmakeResult(data)) {
    throw new Error(
      `Matchmake RPC returned invalid response: ${JSON.stringify(data)}`
    )
  }

  return data
}

function isValidMatchmakeResult(data: unknown): data is MatchmakeResult {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  const s = d.status
  if (s === 'matched' || s === 'already_in_game')
    return typeof d.game_id === 'string' && d.error_message === null
  if (s === 'queued') return d.game_id === null && d.error_message === null
  if (s === 'error')
    return typeof d.error_message === 'string' && d.game_id === null
  return false
}

export async function leaveQueue(userId: string): Promise<void> {
  const { error } = await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', userId)

  logDbQuery({
    table: 'matchmaking_queue',
    action: 'DELETE',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
}

/**
 * Fire-and-forget queue cleanup for use during page unload / unmount.
 * Uses raw fetch with keepalive so the request survives navigation.
 *
 * Accepts supabaseUrl/supabaseKey as params to avoid coupling to any
 * particular build system's env-var mechanism (e.g. Vite's import.meta.env).
 *
 * Errors are intentionally caught and logged only: the page is unloading so
 * there is no user to notify. The server-side pg_cron job cleans stale queue
 * entries as the safety net when this request fails.
 */
export function leaveQueueOnUnload(
  userId: string,
  accessToken: string,
  supabaseUrl: string,
  supabaseKey: string
): void {
  if (!supabaseUrl || !supabaseKey || !accessToken || !userId) {
    console.error(
      'leaveQueueOnUnload: missing URL, key, or token; queue cleanup skipped'
    )
    return
  }

  keepaliveFetch({
    url: `${supabaseUrl}/rest/v1/matchmaking_queue?user_id=eq.${encodeURIComponent(userId)}`,
    method: 'DELETE',
    accessToken,
    supabaseKey,
    label: 'leaveQueueOnUnload',
  })
}

// Only consider match notifications from the last 60s. Older notifications
// are likely stale from a previous matchmaking attempt that was abandoned.
const MATCH_NOTIFICATION_STALENESS_MS = 60_000

/**
 * Fallback polling mechanism for detecting matches. The matchmake RPC is
 * the primary detection path; this polls pvp_match_notifications as a
 * backup in case the RPC misses a concurrent match.
 */
export async function getLatestMatchNotification(
  userId: string
): Promise<string | null> {
  const cutoff = new Date(
    Date.now() - MATCH_NOTIFICATION_STALENESS_MS
  ).toISOString()
  const { data, error } = await supabase
    .from('pvp_match_notifications')
    .select('game_id')
    .eq('user_id', userId)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  logDbQuery({
    table: 'pvp_match_notifications',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error

  return data?.game_id ?? null
}
