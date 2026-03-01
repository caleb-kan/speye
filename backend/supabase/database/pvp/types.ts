export const PVP_GAME_STATUSES = [
  'pending',
  'active',
  'completed',
  'abandoned',
] as const
export type PvpGameStatus = (typeof PVP_GAME_STATUSES)[number]

/**
 * Represents a row from the pvp_games table.
 *
 * Field population by status:
 * - pending: ready booleans default false, progress at 0, all result/elo fields null
 * - active: reading_started_at set, progress updates, result/elo fields null
 * - completed: all per-player result fields populated, elo_before/elo_change set,
 *   winner_id set (or null for draw), finished_at set
 * - abandoned: forfeit_by set, partial results possible,
 *   elo fields always set when forfeit resolves the game
 *
 * expires_at is always set at creation time; used by the server-side
 * expire_pvp_games cron job for stale game cleanup.
 */
export interface PvpGame {
  id: string
  player1_id: string
  player2_id: string
  text_id: string
  quiz_set_index: number
  status: PvpGameStatus
  winner_id: string | null

  // DB columns are nullable but default to false; app-layer always sees boolean
  player1_ready: boolean
  player2_ready: boolean
  player1_wpm: number | null
  player1_quiz_score: number | null
  player1_overall_score: number | null
  player1_finished_at: string | null
  player2_wpm: number | null
  player2_quiz_score: number | null
  player2_overall_score: number | null
  player2_finished_at: string | null

  // DB columns are nullable but default to 0; app-layer always sees number
  player1_progress: number
  player2_progress: number

  player1_elo_before: number | null
  player2_elo_before: number | null
  player1_elo_change: number | null
  player2_elo_change: number | null

  forfeit_by: string | null

  created_at: string
  reading_started_at: string | null
  finished_at: string | null
  expires_at: string
}

export interface PvpRating {
  user_id: string
  elo_rating: number
  peak_elo: number
  games_played: number
  wins: number
  losses: number
  draws: number
  forfeit_count: number
  last_forfeit_at: string | null
  queue_cooldown_until: string | null
  last_game_at: string | null
}

export type MatchmakeResult =
  | { status: 'matched'; game_id: string; error_message: null }
  | { status: 'already_in_game'; game_id: string; error_message: null }
  | { status: 'queued'; game_id: null; error_message: null }
  | { status: 'error'; game_id: null; error_message: string }

export type PvpLeaderboardEntry = Pick<
  PvpRating,
  'user_id' | 'elo_rating' | 'games_played' | 'wins' | 'losses' | 'draws'
> & { username: string | null }

export type PvpLeaderboardEntryWithRank = PvpLeaderboardEntry & { rank: number }

export interface PvpMatchHistoryEntry {
  id: string
  opponent_id: string
  opponent_username: string | null
  text_title: string | null
  status: 'completed' | 'abandoned'
  winner_id: string | null
  my_wpm: number | null
  my_quiz_score: number | null
  my_overall_score: number | null
  opponent_wpm: number | null
  opponent_quiz_score: number | null
  opponent_overall_score: number | null
  my_elo_before: number | null
  my_elo_change: number | null
  created_at: string
  finished_at: string | null
}
