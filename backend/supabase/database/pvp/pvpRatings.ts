import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type {
  PvpRating,
  PvpLeaderboardEntry,
  PvpLeaderboardEntryWithRank,
  EloHistoryPoint,
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

export async function getEloHistory(
  userId: string
): Promise<EloHistoryPoint[]> {
  // Fetch all completed or abandoned games for the user, ordered by date
  const { data, error } = await supabase
    .from('pvp_games')
    .select(
      'finished_at, player1_id, player2_id, player1_elo_change, player2_elo_change'
    )
    .in('status', ['completed', 'abandoned'])
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .order('finished_at', { ascending: true })
    .not('finished_at', 'is', null)

  logDbQuery({
    table: 'pvp_games',
    action: 'SELECT (elo history)',
    errors: error ? error.message : undefined,
  })

  if (error) throw error

  // Get the current elo rating for the user
  const rating = await getPvpRating(userId)
  if (!rating) {
    return []
  }

  const games = data ?? []
  if (games.length === 0) {
    return []
  }

  // Build the elo history by working backwards from the current elo
  let currentElo = rating.elo_rating
  const historyPoints: EloHistoryPoint[] = []

  for (let i = games.length - 1; i >= 0; i--) {
    const game = games[i]
    const eloChange =
      game.player1_id === userId
        ? game.player1_elo_change
        : game.player2_elo_change

    if (eloChange !== null && game.finished_at) {
      // Record the elo before this game
      const eloBefore = currentElo - eloChange
      historyPoints.unshift({
        game_date: game.finished_at,
        elo_rating: eloBefore,
      })
      currentElo = eloBefore
    }
  }

  // Add the final current elo as a point at the current timestamp
  if (historyPoints.length > 0) {
    historyPoints.push({
      game_date: new Date().toISOString(),
      elo_rating: rating.elo_rating,
    })
  }

  return historyPoints
}

export async function searchPvpUserByUsername(
  usernamePattern: string,
  limit = 10
): Promise<PvpLeaderboardEntry[]> {
  // Search users table by username, then include PvP ratings when available
  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      username,
      pvp_ratings (
        elo_rating,
        games_played,
        wins,
        losses,
        draws
      )
    `
    )
    .ilike('username', `%${usernamePattern}%`)
    .limit(limit)

  logDbQuery({
    table: 'users',
    action: 'SELECT (search by username with pvp_ratings)',
    errors: error ? error.message : undefined,
  })

  if (error) throw error

  if (!data) return []

  // Map results and default stats for users who haven't played PvP yet
  return data
    .map((user) => {
      const ratings = Array.isArray(user.pvp_ratings)
        ? user.pvp_ratings[0]
        : user.pvp_ratings
      return {
        user_id: user.id,
        username: user.username,
        elo_rating: ratings?.elo_rating ?? 1000,
        games_played: ratings?.games_played ?? 0,
        wins: ratings?.wins ?? 0,
        losses: ratings?.losses ?? 0,
        draws: ratings?.draws ?? 0,
      }
    })
    .sort((a, b) => b.elo_rating - a.elo_rating)
}
