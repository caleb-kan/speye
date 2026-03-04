export {
  getPvpRating,
  getPvpLeaderboard,
  searchPvpUserByUsername,
} from '../../../backend/supabase/database/pvp/pvpRatings'

export {
  getActiveGame,
  getPvpGame,
  getPvpMatchHistory,
  markReady,
  submitPvpResult,
  forfeitPvpGame,
  getServerTime,
} from '../../../backend/supabase/database/pvp/pvpGames'

export {
  matchmake,
  leaveQueue,
  getLatestMatchNotification,
} from '../../../backend/supabase/database/pvp/matchmakingQueue'

export { getTextForPvp } from '../../../backend/supabase/database/texts/getTextForPvp'
export { getUsernamesByIds } from '../../../backend/supabase/database/users/getUsernamesByIds'

import { forfeitOnUnload as _forfeitOnUnload } from '../../../backend/supabase/database/pvp/pvpGames'
import { leaveQueueOnUnload as _leaveQueueOnUnload } from '../../../backend/supabase/database/pvp/matchmakingQueue'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const msg =
    'pvpService: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY is missing. ' +
    'Unload-time forfeit and queue cleanup will not work.'
  console.error(msg)
  if (import.meta.env.DEV) {
    throw new Error(msg)
  }
}

export function forfeitOnUnload(
  gameId: string,
  userId: string,
  accessToken: string
): void {
  _forfeitOnUnload(gameId, userId, accessToken, SUPABASE_URL, SUPABASE_KEY)
}

export function leaveQueueOnUnload(userId: string, accessToken: string): void {
  _leaveQueueOnUnload(userId, accessToken, SUPABASE_URL, SUPABASE_KEY)
}
