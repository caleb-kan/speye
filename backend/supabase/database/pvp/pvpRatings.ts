import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type {
  PvpRating,
  PvpLeaderboardEntry,
  PvpLeaderboardEntryWithRank,
} from './types'

const LEADERBOARD_TOP_N = 5

const LEADERBOARD_SELECT = `
  user_id,
  elo_rating,
  games_played,
  wins,
  losses,
  draws,
  users(username)
`

function extractUsername(row: {
  users: { username: string } | { username: string }[] | null
}): string | null {
  if (!row.users) return null
  const user = Array.isArray(row.users) ? row.users[0] : row.users
  return user?.username ?? null
}

export async function getPvpRating(userId: string): Promise<PvpRating | null> {
  const { data, error } = await supabase
    .from('pvp_ratings')
    .select(
      'user_id, elo_rating, peak_elo, games_played, wins, losses, draws, forfeit_count, last_forfeit_at, queue_cooldown_until, last_game_at'
    )
    .eq('user_id', userId)
    .maybeSingle()

  logDbQuery({
    table: 'pvp_ratings',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  return data
}

export async function getPvpLeaderboard(currentUserId?: string): Promise<{
  top: PvpLeaderboardEntry[]
  currentUser: PvpLeaderboardEntryWithRank | null
}> {
  const { data, error } = await supabase
    .from('pvp_ratings')
    .select(LEADERBOARD_SELECT)
    .gt('games_played', 0)
    .order('elo_rating', { ascending: false })
    .order('games_played', { ascending: false })
    .order('user_id', { ascending: true })
    .limit(LEADERBOARD_TOP_N)

  logDbQuery({
    table: 'pvp_ratings',
    action: `SELECT (top ${LEADERBOARD_TOP_N})`,
    errors: error ? error.message : undefined,
  })

  if (error) throw error

  const top = (data ?? []).map((row) => ({
    user_id: row.user_id,
    username: extractUsername(row),
    elo_rating: row.elo_rating,
    games_played: row.games_played,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
  }))

  let currentUser: PvpLeaderboardEntryWithRank | null = null

  if (currentUserId && !top.some((e) => e.user_id === currentUserId)) {
    const { data: userData, error: userError } = await supabase
      .from('pvp_ratings')
      .select(LEADERBOARD_SELECT)
      .eq('user_id', currentUserId)
      .gt('games_played', 0)
      .maybeSingle()

    logDbQuery({
      table: 'pvp_ratings',
      action: 'SELECT (current user)',
      errors: userError ? userError.message : undefined,
    })

    if (userError) throw userError

    if (userData) {
      // Count players ranked above. Must match the ORDER BY clauses in the
      // top-N query above (elo DESC, games_played DESC, user_id ASC).
      const { count, error: countError } = await supabase
        .from('pvp_ratings')
        .select('user_id', { count: 'exact', head: true })
        .gt('games_played', 0)
        .or(
          `elo_rating.gt.${userData.elo_rating},and(elo_rating.eq.${userData.elo_rating},games_played.gt.${userData.games_played}),and(elo_rating.eq.${userData.elo_rating},games_played.eq.${userData.games_played},user_id.lt.${userData.user_id})`
        )

      logDbQuery({
        table: 'pvp_ratings',
        action: 'SELECT (rank count)',
        errors: countError ? countError.message : undefined,
      })

      if (countError) throw countError

      const rank = (count ?? 0) + 1
      currentUser = {
        user_id: userData.user_id,
        username: extractUsername(userData),
        elo_rating: userData.elo_rating,
        games_played: userData.games_played,
        wins: userData.wins,
        losses: userData.losses,
        draws: userData.draws,
        rank,
      }
    }
  }

  return { top, currentUser }
}
