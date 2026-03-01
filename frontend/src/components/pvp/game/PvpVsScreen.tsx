import { PvpRankBadge } from '../shared/PvpRankBadge'
import { EloDisplay } from '../shared/EloDisplay'

type PlayerCardData = {
  username: string
  elo: number | null
  wins: number | null
  losses: number | null
}

type PvpVsScreenProps = {
  player: PlayerCardData
  opponent: PlayerCardData | null
}

function PlayerCard({ player }: { player: PlayerCardData }) {
  return (
    <>
      <PvpRankBadge elo={player.elo} size="lg" />
      <span className="text-lg font-semibold text-text">{player.username}</span>
      <EloDisplay elo={player.elo} size="md" />
      <span className="text-xs text-text-secondary">
        {player.wins != null && player.losses != null
          ? `${player.wins}W - ${player.losses}L`
          : '--'}
      </span>
    </>
  )
}

export function PvpVsScreen({ player, opponent }: PvpVsScreenProps) {
  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-center min-h-[60vh] gap-6 sm:gap-8 px-4"
      role="status"
      aria-label={
        opponent
          ? `${player.username} versus ${opponent.username}`
          : `${player.username} waiting for opponent`
      }
    >
      <div className="animate-in slide-in-from-left-8 fade-in duration-500 flex flex-col items-center gap-3">
        <PlayerCard player={player} />
      </div>

      <div
        className="animate-in zoom-in fade-in duration-700 delay-300"
        aria-hidden="true"
      >
        <span className="text-4xl font-black text-primary">VS</span>
      </div>

      <div className="animate-in slide-in-from-right-8 fade-in duration-500 flex flex-col items-center gap-3">
        {opponent ? (
          <PlayerCard player={opponent} />
        ) : (
          <>
            <div className="w-16 h-16 rounded-xl bg-text-secondary/10 animate-pulse" />
            <span className="text-lg text-text-secondary">Waiting...</span>
          </>
        )}
      </div>
    </div>
  )
}
