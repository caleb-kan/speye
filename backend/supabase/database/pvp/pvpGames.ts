import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import { MAX_QUIZ_SCORE } from '../../../../lib/quizConstants'
import { keepaliveFetch } from './keepaliveFetch'
import type { PvpGame, PvpMatchHistoryEntry } from './types'

/** Returns the user's most recent pending or active PvP game, if any. Used to redirect users back to in-progress games. */
export async function getActiveGame(userId: string): Promise<PvpGame | null> {
  const { data, error } = await supabase
    .from('pvp_games')
    .select('*')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  logDbQuery({
    table: 'pvp_games',
    action: 'SELECT (active game)',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  return data
}

export async function getPvpGame(gameId: string): Promise<PvpGame | null> {
  const { data, error } = await supabase
    .from('pvp_games')
    .select('*')
    .eq('id', gameId)
    .maybeSingle()

  logDbQuery({
    table: 'pvp_games',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  return data
}

const DEFAULT_MATCH_HISTORY_LIMIT = 20

const MAX_MATCH_HISTORY_LIMIT = 100

export async function getPvpMatchHistory(
  userId: string,
  limit = DEFAULT_MATCH_HISTORY_LIMIT,
  offset = 0
): Promise<PvpMatchHistoryEntry[]> {
  const safeLimit = Math.max(
    1,
    Math.min(MAX_MATCH_HISTORY_LIMIT, Math.floor(limit))
  )
  const safeOffset = Math.max(0, Math.floor(offset))

  const { data, error } = await supabase.rpc('get_pvp_match_history', {
    p_user_id: userId,
    p_limit: safeLimit,
    p_offset: safeOffset,
  })

  logDbQuery({
    table: 'pvp_games',
    action: 'RPC:get_pvp_match_history',
    errors: error ? error.message : undefined,
  })

  if (error) throw error

  return data ?? []
}

export async function markReady(
  gameId: string,
  userId: string
): Promise<PvpGame> {
  const { data, error } = await supabase.rpc('pvp_mark_ready', {
    p_game_id: gameId,
    p_user_id: userId,
  })

  logDbQuery({
    table: 'pvp_games',
    action: 'RPC:pvp_mark_ready',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  if (!data) throw new Error('Mark ready returned no game data')
  return data
}

// Matches the frontend WPM limit in frontend/src/constants/wpm.ts.
const MAX_WPM = 2000

/**
 * Submits a player's result for a PvP game via the `submit_pvp_result` RPC.
 * Validates WPM and quiz score ranges client-side before calling. Returns
 * the updated game (which may be `completed` if both players have submitted).
 */
export async function submitPvpResult(
  gameId: string,
  userId: string,
  wpm: number,
  quizScore: number
): Promise<PvpGame> {
  if (!Number.isFinite(wpm) || wpm < 0 || wpm > MAX_WPM) {
    throw new Error(`wpm must be a finite number between 0 and ${MAX_WPM}`)
  }
  if (
    !Number.isFinite(quizScore) ||
    quizScore < 0 ||
    quizScore > MAX_QUIZ_SCORE
  ) {
    throw new Error(
      `quizScore must be a finite number between 0 and ${MAX_QUIZ_SCORE}`
    )
  }

  const { data, error } = await supabase.rpc('submit_pvp_result', {
    p_game_id: gameId,
    p_user_id: userId,
    p_wpm: wpm,
    p_quiz_score: quizScore,
  })

  logDbQuery({
    table: 'pvp_games',
    action: 'RPC:submit_pvp_result',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  if (!data) throw new Error('Submit result returned no game data')
  return data
}

export async function forfeitPvpGame(
  gameId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('forfeit_pvp_game', {
    p_game_id: gameId,
    p_user_id: userId,
  })

  logDbQuery({
    table: 'pvp_games',
    action: 'RPC:forfeit_pvp_game',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
}

/**
 * Fire-and-forget forfeit for use during page unload / unmount.
 * Uses raw fetch with keepalive so the request survives navigation.
 *
 * Errors are intentionally caught and logged only: the page is unloading so
 * there is no user to notify. Server-side game expiration and the opponent's
 * client detecting a missing heartbeat provide the safety net when this
 * request fails.
 */
export function forfeitOnUnload(
  gameId: string,
  userId: string,
  accessToken: string,
  supabaseUrl: string,
  supabaseKey: string
): void {
  if (!supabaseUrl || !supabaseKey || !accessToken || !gameId || !userId) {
    console.error('forfeitOnUnload: missing required params; forfeit skipped')
    return
  }

  keepaliveFetch({
    url: `${supabaseUrl}/rest/v1/rpc/forfeit_pvp_game`,
    method: 'POST',
    accessToken,
    supabaseKey,
    body: { p_game_id: gameId, p_user_id: userId },
    label: 'forfeitOnUnload',
  })
}

export async function getServerTime(): Promise<string> {
  const { data, error } = await supabase.rpc('get_server_time')

  logDbQuery({
    table: 'rpc',
    action: 'RPC:get_server_time',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  if (!data || typeof data !== 'string') {
    throw new Error('Server time RPC returned invalid data')
  }
  return data
}
