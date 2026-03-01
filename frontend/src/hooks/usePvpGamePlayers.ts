import { useState, useEffect } from 'react'
import { getUsernamesByIds, getPvpRating } from '../services/pvpService'
import { PVP_STARTING_ELO } from '../constants/pvp'
import type { PvpGame, PvpRating } from '../types/database'

function eloFromResult(
  result: PromiseSettledResult<PvpRating | null>
): number | null {
  if (result.status === 'rejected') return null
  return result.value?.elo_rating ?? PVP_STARTING_ELO
}

type PlayerInfo = {
  myUsername: string
  opponentUsername: string
  myElo: number | null
  opponentElo: number | null
  myWins: number | null
  myLosses: number | null
  opponentWins: number | null
  opponentLosses: number | null
}

const DEFAULT_INFO: PlayerInfo = {
  myUsername: 'You',
  opponentUsername: 'Opponent',
  myElo: null,
  opponentElo: null,
  myWins: null,
  myLosses: null,
  opponentWins: null,
  opponentLosses: null,
}

export function usePvpGamePlayers(
  game: PvpGame | null,
  userId: string | null
): PlayerInfo & { loaded: boolean; error: string | null } {
  const [info, setInfo] = useState<PlayerInfo>(DEFAULT_INFO)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gameId = game?.id ?? null
  const isPlayer1 = game != null && userId != null && game.player1_id === userId
  const oppId = game ? (isPlayer1 ? game.player2_id : game.player1_id) : null

  useEffect(() => {
    if (!gameId || !userId || !oppId) return
    // Syncing state with changed deps: reset stale data from a previous
    // game while the new fetch is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInfo(DEFAULT_INFO)
    setLoaded(false)
    setError(null)
    let cancelled = false

    async function fetchPlayerInfo() {
      try {
        const [usernamesResult, myRatingResult, oppRatingResult] =
          await Promise.allSettled([
            getUsernamesByIds([userId!, oppId!]),
            getPvpRating(userId!),
            getPvpRating(oppId!),
          ])

        if (cancelled) return

        let myUsername = 'You'
        let opponentUsername = 'Opponent'
        if (usernamesResult.status === 'fulfilled') {
          for (const u of usernamesResult.value) {
            if (u.id === userId) myUsername = u.username ?? 'You'
            else opponentUsername = u.username ?? 'Opponent'
          }
        }

        const myRating =
          myRatingResult.status === 'fulfilled' ? myRatingResult.value : null
        const oppRating =
          oppRatingResult.status === 'fulfilled' ? oppRatingResult.value : null

        setInfo({
          myUsername,
          opponentUsername,
          myElo: eloFromResult(myRatingResult),
          opponentElo: eloFromResult(oppRatingResult),
          myWins: myRating?.wins ?? null,
          myLosses: myRating?.losses ?? null,
          opponentWins: oppRating?.wins ?? null,
          opponentLosses: oppRating?.losses ?? null,
        })

        const failures: string[] = []
        if (usernamesResult.status === 'rejected') {
          console.error('Username fetch failed:', usernamesResult.reason)
          failures.push('usernames')
        }
        if (myRatingResult.status === 'rejected') {
          console.error('Own rating fetch failed:', myRatingResult.reason)
          failures.push('your rating')
        }
        if (oppRatingResult.status === 'rejected') {
          console.error('Opponent rating fetch failed:', oppRatingResult.reason)
          failures.push('opponent rating')
        }
        if (failures.length > 0) {
          setError(`Could not load ${failures.join(', ')}`)
        } else {
          setError(null)
        }
        setLoaded(true)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to fetch player info:', err)
        setError('Failed to load player info')
        setLoaded(true)
      }
    }

    fetchPlayerInfo()
    return () => {
      cancelled = true
    }
  }, [gameId, userId, oppId])

  return { ...info, loaded, error }
}
