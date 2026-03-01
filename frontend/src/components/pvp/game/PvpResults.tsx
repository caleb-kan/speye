import { useNavigate } from 'react-router-dom'
import { PvpRankBadge } from '../shared/PvpRankBadge'
import { EloDisplay } from '../shared/EloDisplay'
import { useEloAnimation } from '../../../hooks/useEloAnimation'
import { ROUTES } from '../../../utils/routes'
import {
  getPlayerPrefix,
  getPlayerData,
  getMatchResult,
} from '../../../utils/pvp'
import type { PvpGame } from '../../../types/database'
import type { MatchResult } from '../../../utils/pvp'

const RESULT_DISPLAY: Record<MatchResult, { text: string; color: string }> = {
  win: { text: 'VICTORY', color: 'text-success' },
  draw: { text: 'DRAW', color: 'text-warning' },
  loss: { text: 'DEFEAT', color: 'text-error' },
}

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
    displayElo,
    eloChange,
    eloAfter,
    eloReady,
    eloFetchFailed,
    rankPromoted,
    newRankTier,
    newRankColor,
    game,
  } = useEloAnimation(initialGame, userId, result === 'win')

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
        eloAfter={eloAfter}
        displayElo={displayElo}
        eloChange={eloChange}
      />

      {rankPromoted && newRankColor && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 p-4 rounded-xl animate-in zoom-in duration-700 delay-500"
          style={{
            // Hex-alpha opacity: 15 = ~8%, 40 = ~25%.
            // Safe because newRankColor is always a 6-digit hex from RANK_TIERS.
            backgroundColor: `${newRankColor}15`,
            border: `1px solid ${newRankColor}40`,
          }}
        >
          <p className="text-sm text-text-secondary mb-1">Promoted to</p>
          <p className="text-xl font-bold" style={{ color: newRankColor }}>
            {newRankTier}
          </p>
        </div>
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
  eloAfter,
  displayElo,
  eloChange,
}: {
  eloReady: boolean
  eloFetchFailed: boolean
  eloAfter: number | null
  displayElo: number | null
  eloChange: number | null
}) {
  if (eloReady && eloAfter != null) {
    return (
      <div className="flex items-center justify-center gap-3 mb-8">
        <PvpRankBadge elo={eloAfter} size="md" />
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
