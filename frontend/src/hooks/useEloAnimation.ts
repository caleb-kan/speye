import { useEffect, useRef, useState } from 'react'
import { getPvpGame } from '../services/pvpService'
import {
  PVP_ELO_ANIMATION_DURATION_MS,
  PVP_ELO_ANIMATION_FRAME_MS,
  PVP_ELO_REFETCH_DELAY_MS,
  PVP_ELO_MAX_REFETCH_ATTEMPTS,
} from '../constants/pvp'
import type { RankTier } from '../constants/pvp'
import { getRankFromElo, getPlayerPrefix, getPlayerData } from '../utils/pvp'
import { CUBIC_EASE_OUT_EXPONENT } from '../constants/ui'
import type { PvpGame } from '../types/database'

type EloAnimationResult = {
  eloBefore: number | null
  displayElo: number | null
  eloChange: number | null
  eloAfter: number | null
  eloReady: boolean
  eloFetchFailed: boolean
  rankPromoted: boolean
  rankDemoted: boolean
  newRankTier: RankTier | null
  newRankColor: string | null
  game: PvpGame
}

export function useEloAnimation(
  initialGame: PvpGame,
  userId: string
): EloAnimationResult {
  const [game, setGame] = useState(initialGame)

  const { myPrefix } = getPlayerPrefix(userId, game.player1_id)
  const myData = getPlayerData(game, myPrefix)

  const eloChange = myData.elo_change
  const eloBefore = myData.elo_before
  const eloReady = eloBefore != null && eloChange != null
  const eloAfter = eloReady ? eloBefore + eloChange : null

  // Sync with parent prop updates only when the parent supplies elo data
  // that the local state is missing. Avoids overwriting a successful refetch
  // with an older parent reference that lacks elo fields.
  useEffect(() => {
    const propData = getPlayerData(initialGame, myPrefix)
    const propHasElo =
      propData.elo_before != null && propData.elo_change != null
    if (propHasElo && !eloReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGame(initialGame)
    }
  }, [initialGame, myPrefix, eloReady])

  // Re-fetch game if Elo data isn't populated yet (race with RPC completion)
  const refetchCountRef = useRef(0)
  const [eloFetchFailed, setEloFetchFailed] = useState(false)
  const [retryTrigger, setRetryTrigger] = useState(0)
  // Reset refetch state when navigating to a new game so stale retry
  // counts from a previous game don't block fetching elo for the new one.
  useEffect(() => {
    refetchCountRef.current = 0
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEloFetchFailed(false)
    setRetryTrigger(0)
  }, [initialGame.id])

  useEffect(() => {
    if (eloReady) return
    if (refetchCountRef.current >= PVP_ELO_MAX_REFETCH_ATTEMPTS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEloFetchFailed(true)
      return
    }

    function retryOrFail() {
      if (refetchCountRef.current >= PVP_ELO_MAX_REFETCH_ATTEMPTS) {
        setEloFetchFailed(true)
      } else {
        setRetryTrigger((t) => t + 1)
      }
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      refetchCountRef.current++
      try {
        const updated = await getPvpGame(initialGame.id)
        if (cancelled) return
        if (updated) setGame(updated)
        else retryOrFail()
      } catch (err) {
        if (cancelled) return
        console.error('Elo refetch failed:', err)
        retryOrFail()
      }
    }, PVP_ELO_REFETCH_DELAY_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [eloReady, initialGame.id, retryTrigger])

  const [displayElo, setDisplayElo] = useState(eloReady ? eloBefore : null)
  useEffect(() => {
    if (eloBefore == null || eloAfter == null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayElo(eloBefore)

    const diff = eloAfter - eloBefore
    if (diff === 0) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / PVP_ELO_ANIMATION_DURATION_MS)
      const eased = 1 - Math.pow(1 - progress, CUBIC_EASE_OUT_EXPONENT)
      setDisplayElo(Math.round(eloBefore + diff * eased))
      if (progress >= 1) clearInterval(interval)
    }, PVP_ELO_ANIMATION_FRAME_MS)

    return () => clearInterval(interval)
  }, [eloBefore, eloAfter])

  const oldRank = eloReady ? getRankFromElo(eloBefore) : null
  const newRank = eloReady && eloAfter != null ? getRankFromElo(eloAfter) : null
  const rankChanged =
    oldRank != null && newRank != null && oldRank.tier !== newRank.tier
  const rankPromoted =
    rankChanged && eloBefore != null && eloAfter != null && eloAfter > eloBefore
  const rankDemoted =
    rankChanged && eloBefore != null && eloAfter != null && eloAfter < eloBefore

  return {
    eloBefore: eloBefore ?? null,
    displayElo,
    eloChange,
    eloAfter,
    eloReady,
    eloFetchFailed,
    rankPromoted,
    rankDemoted,
    newRankTier: rankChanged && newRank ? newRank.tier : null,
    newRankColor: rankChanged && newRank ? newRank.color : null,
    game,
  }
}
