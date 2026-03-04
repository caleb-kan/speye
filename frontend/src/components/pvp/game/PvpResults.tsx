import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PvpRankBadge } from '../shared/PvpRankBadge'
import { EloDisplay } from '../shared/EloDisplay'
import { useEloAnimation } from '../../../hooks/useEloAnimation'
import { ROUTES } from '../../../utils/routes'
import {
  getRankFromElo,
  getPlayerPrefix,
  getPlayerData,
  getMatchResult,
} from '../../../utils/pvp'
import {
  PVP_RANK_FILL_DURATION_MS,
  PVP_RANK_SWAP_DELAY_MS,
  PVP_EVOLUTION_BANNER_DELAY_MS,
  RESULT_DISPLAY,
} from '../../../constants/pvp'
import type { PvpGame } from '../../../types/database'
import type { RankInfo } from '../../../constants/pvp'

type PvpResultsProps = {
  game: PvpGame
  userId: string
  myUsername: string
  opponentUsername: string
}

export function PvpResults({
  game: initialGame,
  userId,
  myUsername,
  opponentUsername,
}: PvpResultsProps) {
  const navigate = useNavigate()

  const isForfeit = initialGame.forfeit_by != null
  const result = getMatchResult(initialGame.winner_id, userId, isForfeit)

  const {
    eloBefore,
    displayElo,
    eloChange,
    eloAfter,
    eloReady,
    eloFetchFailed,
    rankPromoted,
    rankDemoted,
    newRankTier,
    newRankColor,
    game,
  } = useEloAnimation(initialGame, userId)

  const { myPrefix, oppPrefix } = getPlayerPrefix(userId, game.player1_id)
  const myData = getPlayerData(game, myPrefix)
  const oppData = getPlayerData(game, oppPrefix)

  const { text: resultText, color: resultColor } = RESULT_DISPLAY[result]

  return (
    <div className="max-w-lg mx-auto text-center animate-in fade-in zoom-in-95 duration-500">
      <h1 className={`text-5xl font-black ${resultColor} mb-2`}>
        {resultText}
      </h1>
      {isForfeit && (
        <p className="text-sm text-text-secondary mb-4">
          {initialGame.forfeit_by === userId
            ? 'You forfeited'
            : 'Opponent forfeited'}
        </p>
      )}

      <EloSection
        eloReady={eloReady}
        eloFetchFailed={eloFetchFailed}
        eloBefore={eloBefore}
        eloAfter={eloAfter}
        displayElo={displayElo}
        eloChange={eloChange}
        rankChanged={rankPromoted || rankDemoted}
      />

      {eloReady && eloBefore != null && eloAfter != null && (
        <EloProgressBar
          eloBefore={eloBefore}
          eloAfter={eloAfter}
          rankChanged={rankPromoted || rankDemoted}
        />
      )}

      {(rankPromoted || rankDemoted) &&
        newRankTier &&
        newRankColor &&
        eloAfter != null && (
          <EvolutionBanner
            newRankTier={newRankTier}
            newRankColor={newRankColor}
            newRankEmoji={getRankFromElo(eloAfter).emoji}
            demoted={rankDemoted}
          />
        )}

      <div className="bg-bg-secondary/50 rounded-2xl border border-text-secondary/10 p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="min-w-0">
            <p className="text-xs text-text-secondary mb-2 truncate">
              {myUsername}
            </p>
          </div>
          <div />
          <div className="min-w-0">
            <p className="text-xs text-text-secondary mb-2 truncate">
              {opponentUsername}
            </p>
          </div>

          <StatRow
            myVal={myData.wpm}
            oppVal={oppData.wpm}
            label="WPM"
            suffix=""
          />
          <StatRow
            myVal={myData.quiz_score}
            oppVal={oppData.quiz_score}
            label="Quiz"
            suffix="%"
          />
          <StatRow
            myVal={myData.overall_score}
            oppVal={oppData.overall_score}
            label="Score"
            suffix=""
          />
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => navigate(ROUTES.PVP)}
          className="
            px-6 py-3 rounded-xl
            border border-text-secondary/20 text-text
            hover:bg-text-secondary/10
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          "
        >
          Back to Lobby
        </button>
        <button
          onClick={() => navigate(ROUTES.PVP, { state: { autoQueue: true } })}
          className="
            px-6 py-3 rounded-xl
            bg-text text-bg font-semibold
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          "
        >
          Play Again
        </button>
      </div>
    </div>
  )
}

function EloSection({
  eloReady,
  eloFetchFailed,
  eloBefore,
  eloAfter,
  displayElo,
  eloChange,
  rankChanged,
}: {
  eloReady: boolean
  eloFetchFailed: boolean
  eloBefore: number | null
  eloAfter: number | null
  displayElo: number | null
  eloChange: number | null
  rankChanged: boolean
}) {
  const [showNewRank, setShowNewRank] = useState(false)

  useEffect(() => {
    if (!rankChanged) return
    const t = setTimeout(() => setShowNewRank(true), PVP_RANK_SWAP_DELAY_MS)
    return () => clearTimeout(t)
  }, [rankChanged])

  const badgeElo = rankChanged && !showNewRank ? eloBefore : eloAfter

  if (eloReady && eloAfter != null) {
    return (
      <div className="flex items-center justify-center gap-3 mb-8">
        <PvpRankBadge elo={badgeElo} size="md" />
        <EloDisplay elo={displayElo ?? 0} change={eloChange} size="lg" />
      </div>
    )
  }

  if (eloFetchFailed) {
    return (
      <p className="text-sm text-text-secondary mb-8">
        Elo data unavailable. Refresh to retry.
      </p>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <div className="w-10 h-10 rounded-full bg-text-secondary/20 animate-pulse" />
      <div className="h-8 w-24 rounded bg-text-secondary/20 animate-pulse" />
    </div>
  )
}

function StatRow({
  myVal,
  oppVal,
  label,
  suffix,
}: {
  myVal: number | null
  oppVal: number | null
  label: string
  suffix: string
}) {
  const myBetter = myVal != null && oppVal != null && myVal > oppVal
  const oppBetter = myVal != null && oppVal != null && oppVal > myVal

  return (
    <>
      <span
        className={`text-lg font-semibold tabular-nums ${
          myBetter ? 'text-primary' : 'text-text'
        }`}
      >
        {myVal != null ? `${myVal}${suffix}` : '-'}
      </span>
      <span className="text-xs text-text-secondary self-center">{label}</span>
      <span
        className={`text-lg font-semibold tabular-nums ${
          oppBetter ? 'text-primary' : 'text-text'
        }`}
      >
        {oppVal != null ? `${oppVal}${suffix}` : '-'}
      </span>
    </>
  )
}

function tierProgress(elo: number, rank: RankInfo): number {
  if (rank.maxElo === null) return 100
  const range = rank.maxElo - rank.minElo + 1
  return Math.min(100, Math.max(0, ((elo - rank.minElo) / range) * 100))
}

function EloProgressBar({
  eloBefore,
  eloAfter,
  rankChanged,
}: {
  eloBefore: number
  eloAfter: number
  rankChanged: boolean
}) {
  const oldRank = getRankFromElo(eloBefore)
  const newRank = getRankFromElo(eloAfter)
  const startProgress = tierProgress(eloBefore, oldRank)
  const isGain = eloAfter >= eloBefore

  const [phase, setPhase] = useState<
    'initial' | 'filling' | 'rolling' | 'swapped'
  >('initial')

  useEffect(() => {
    const t1 = requestAnimationFrame(() => setPhase('filling'))
    if (!rankChanged) return () => cancelAnimationFrame(t1)
    const t2 = setTimeout(() => setPhase('rolling'), PVP_RANK_FILL_DURATION_MS)
    const t3 = setTimeout(() => setPhase('swapped'), PVP_RANK_SWAP_DELAY_MS)
    return () => {
      cancelAnimationFrame(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [rankChanged])

  const showOld = phase === 'initial' || phase === 'filling'
  const isRolling = phase === 'rolling'
  const showNew = phase === 'swapped'
  const displayRank = showOld || isRolling ? oldRank : newRank

  let barWidth: number
  if (rankChanged) {
    if (phase === 'initial') barWidth = startProgress
    // On demotion, bar drains to 0%; on promotion, fills to 100%
    else if (phase === 'filling' || phase === 'rolling')
      barWidth = isGain ? 100 : 0
    else barWidth = tierProgress(eloAfter, newRank)
  } else {
    barWidth =
      phase === 'initial' ? startProgress : tierProgress(eloAfter, newRank)
  }

  return (
    <div className="mb-6 w-80 mx-auto">
      {/* Label row with roll animation on rank change */}
      <div className="overflow-hidden mb-1.5">
        <div
          key={displayRank.tier}
          className={isRolling ? 'roll-out-up' : showNew ? 'roll-in-up' : ''}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{displayRank.emoji}</span>
            <span className="text-xs font-medium text-text-secondary">
              {displayRank.tier}
            </span>
            <span className="ml-auto text-xs font-semibold tabular-nums text-text">
              {eloBefore} → {eloAfter}
            </span>
          </div>
        </div>
      </div>

      <div className="h-4 rounded-full bg-text-secondary/10 overflow-hidden">
        <BarFill
          width={barWidth}
          color={isGain ? 'bg-success' : 'bg-error'}
          resetFrom={showNew ? (isGain ? 0 : 100) : undefined}
        />
      </div>

      <div className="overflow-hidden mt-0.5">
        <div
          key={`range-${displayRank.tier}`}
          className={isRolling ? 'roll-out-up' : showNew ? 'roll-in-up' : ''}
        >
          <div className="flex justify-between text-[10px] text-text-secondary tabular-nums">
            <span>{displayRank.minElo}</span>
            <span>
              {displayRank.maxElo !== null ? displayRank.maxElo + 1 : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EvolutionBanner({
  newRankTier,
  newRankColor,
  newRankEmoji,
  demoted,
}: {
  newRankTier: string
  newRankColor: string
  newRankEmoji: string
  demoted: boolean
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), PVP_EVOLUTION_BANNER_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div role="status" aria-live="polite" className="mb-6 overflow-hidden">
      <div className="roll-in-up">
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: `${newRankColor}15`,
            border: `1px solid ${newRankColor}40`,
          }}
        >
          <p className="text-sm text-text-secondary mb-1">
            {demoted ? 'De-evolved into' : 'Evolved into'}
          </p>
          <p className="text-2xl font-bold" style={{ color: newRankColor }}>
            <span className="mr-2">{newRankEmoji}</span>
            {newRankTier}
          </p>
        </div>
      </div>
    </div>
  )
}

function BarFill({
  width,
  color,
  resetFrom,
}: {
  width: number
  color: string
  resetFrom?: number
}) {
  const hasReset = resetFrom !== undefined
  const [animatedWidth, setAnimatedWidth] = useState(
    hasReset ? resetFrom : width
  )
  const [transition, setTransition] = useState(!hasReset)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasReset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimatedWidth(width)
      return
    }
    setTransition(false)
    setAnimatedWidth(resetFrom)

    const raf = requestAnimationFrame(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ref.current?.offsetHeight
      setTransition(true)
      setAnimatedWidth(width)
    })
    return () => cancelAnimationFrame(raf)
  }, [width, resetFrom, hasReset])

  return (
    <div
      ref={ref}
      className={`h-full rounded-full ${color}`}
      style={{
        width: `${animatedWidth}%`,
        transition: transition ? 'width 1s ease-out' : 'none',
      }}
    />
  )
}
