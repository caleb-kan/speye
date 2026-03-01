import { useParams, useNavigate } from 'react-router-dom'
import { CalibrationProvider } from '../context/CalibrationProvider'
import { useAuth } from '../hooks/useAuth'
import { usePvpGameState } from '../hooks/usePvpGameState'
import { usePvpGamePlayers } from '../hooks/usePvpGamePlayers'
import { usePvpGameCallbacks } from '../hooks/usePvpGameCallbacks'
import { PvpVsScreen } from '../components/pvp/game/PvpVsScreen'
import { PvpCountdown } from '../components/pvp/game/PvpCountdown'
import { PvpOpponentBar } from '../components/pvp/game/PvpOpponentBar'
import { PvpQuiz } from '../components/pvp/game/PvpQuiz'
import { PvpResults } from '../components/pvp/game/PvpResults'
import { PvpWaitingScreen } from '../components/pvp/game/PvpWaitingScreen'
import { PvpMilestoneToast } from '../components/pvp/game/PvpMilestoneToast'
import { PvpGameBanners } from '../components/pvp/game/PvpGameBanners'
import { PvpReadingPhase } from '../components/pvp/game/PvpReadingPhase'
import { PvpErrorBoundary } from '../components/pvp/game/PvpErrorBoundary'
import {
  PvpCenteredMessage,
  PvpLoadingSpinner,
  PvpLoginRequired,
} from '../components/pvp/shared/PvpCenteredMessage'
import { ROUTES } from '../utils/routes'

export function PvpGame() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { user, session, loading: authLoading } = useAuth()
  const gameState = usePvpGameState(gameId ?? null)
  const {
    phase,
    game,
    text,
    questionSet,
    serverTimeOffset,
    error,
    clockSyncWarning,
    pendingSubmit,
  } = gameState

  const players = usePvpGamePlayers(game, user?.id ?? null)

  const callbacks = usePvpGameCallbacks({
    gameId: gameId ?? null,
    userId: user?.id ?? null,
    phase,
    text,
    pendingSubmit,
    handleGameUpdate: gameState.handleGameUpdate,
    startQuiz: gameState.startQuiz,
    finishQuiz: gameState.finishQuiz,
    showResults: gameState.showResults,
    setGame: gameState.setGame,
  })

  if (phase === 'loading' || authLoading) return <PvpLoadingSpinner />
  if (!user) return <PvpLoginRequired />
  if (!gameId) {
    return (
      <PvpCenteredMessage>
        <p className="text-error" role="alert">
          Invalid game URL.
        </p>
      </PvpCenteredMessage>
    )
  }

  if (phase === 'error' || !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-error" role="alert">
          {error ?? 'Something went wrong'}
        </p>
        <button
          onClick={() => navigate(ROUTES.PVP)}
          className="px-4 py-2 rounded-lg border border-text-secondary/20 text-text hover:bg-text-secondary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Back to Lobby
        </button>
      </div>
    )
  }

  return (
    <CalibrationProvider>
      <PvpErrorBoundary
        onNavigateToLobby={() => navigate(ROUTES.PVP)}
        gameId={gameId}
        userId={user.id}
        accessToken={session?.access_token}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <PvpGameBanners
            afkWarning={callbacks.afkWarning}
            opponentDisconnected={callbacks.opponentDisconnected}
            submitError={callbacks.submitError}
            forfeitError={callbacks.forfeitError}
            connectionLost={callbacks.connectionLost}
            playerInfoError={players.error}
            saveWarning={callbacks.saveWarning}
            clockSyncWarning={clockSyncWarning}
            onRetrySubmit={callbacks.retrySubmit}
          />
          <PvpMilestoneToast milestones={callbacks.milestones} />

          <div className="flex-1 flex flex-col min-h-0">
            {phase === 'pregame' && (
              <PvpVsScreen
                player={{
                  username: players.myUsername,
                  elo: players.myElo,
                  wins: players.myWins,
                  losses: players.myLosses,
                }}
                opponent={
                  players.loaded
                    ? {
                        username: players.opponentUsername,
                        elo: players.opponentElo,
                        wins: players.opponentWins,
                        losses: players.opponentLosses,
                      }
                    : null
                }
              />
            )}

            {phase === 'countdown' && game.reading_started_at && (
              <PvpCountdown
                startTime={
                  new Date(game.reading_started_at).getTime() + serverTimeOffset
                }
                onComplete={gameState.startReading}
              />
            )}

            {phase === 'reading' &&
              (text ? (
                <PvpReadingPhase
                  text={text}
                  wpm={callbacks.playerWpm}
                  onComplete={callbacks.handleReadingComplete}
                  onPositionChange={callbacks.handlePositionChange}
                  onAdaptiveWpmChange={callbacks.handleAdaptiveWpmChange}
                />
              ) : (
                <PvpCenteredMessage>
                  <p className="text-error" role="alert">
                    Failed to load text.
                  </p>
                </PvpCenteredMessage>
              ))}

            {phase === 'quiz' &&
              (questionSet ? (
                <PvpQuiz
                  questionSet={questionSet}
                  onFinish={callbacks.handleQuizFinish}
                />
              ) : (
                <PvpCenteredMessage>
                  <p className="text-error" role="alert">
                    Failed to load quiz.
                  </p>
                </PvpCenteredMessage>
              ))}

            {phase === 'waiting' && (
              <PvpWaitingScreen
                myWpm={callbacks.myWpm}
                myQuizScore={callbacks.myQuizScore}
                myOverallScore={callbacks.myOverallScore}
                onLeave={() => navigate(ROUTES.PVP)}
                hasSubmitError={!!callbacks.submitError}
              />
            )}

            {phase === 'results' && (
              <div className="flex-1 flex items-center justify-center">
                <PvpResults
                  game={game}
                  userId={user.id}
                  myUsername={players.myUsername}
                  opponentUsername={players.opponentUsername}
                />
              </div>
            )}
          </div>

          {(phase === 'reading' || phase === 'quiz') && (
            <PvpOpponentBar
              myProgress={callbacks.myProgress}
              opponentProgress={callbacks.opponentProgress}
              myUsername={players.myUsername}
              opponentUsername={players.opponentUsername}
              elapsedSeconds={callbacks.elapsedSeconds}
              opponentDisconnected={callbacks.opponentDisconnected}
            />
          )}
        </div>
      </PvpErrorBoundary>
    </CalibrationProvider>
  )
}
