import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { PvpRankCard } from './PvpRankCard'
import { PvpLeaderboard } from './PvpLeaderboard'
import { PvpMatchHistory } from './PvpMatchHistory'
import { PvpQueueOverlay } from './PvpQueueOverlay'
import { usePvpRating } from '../../../hooks/usePvpRating'
import { usePvpLeaderboard } from '../../../hooks/usePvpLeaderboard'
import { usePvpMatchHistory } from '../../../hooks/usePvpMatchHistory'
import { usePvpMatchmaking } from '../../../hooks/usePvpMatchmaking'
import { useAuth } from '../../../hooks/useAuth'
import { ROUTES } from '../../../utils/routes'

export function PvpLobby() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const autoQueueTriggered = useRef(false)
  const { rating, loading: ratingLoading, error: ratingError } = usePvpRating()
  const {
    top: lbTop,
    currentUser: lbCurrentUser,
    loading: lbLoading,
    error: lbError,
  } = usePvpLeaderboard()
  const {
    matches,
    loading: historyLoading,
    error: historyError,
  } = usePvpMatchHistory()

  const { state, gameId, queueTime, error, joinQueue, cancelQueue } =
    usePvpMatchmaking(rating?.elo_rating ?? null)

  useEffect(() => {
    if (state === 'matched' && gameId) {
      navigate(`${ROUTES.PVP}/${gameId}`)
    }
  }, [state, gameId, navigate])

  useEffect(() => {
    const navState = location.state as { autoQueue?: boolean } | null
    if (
      navState?.autoQueue &&
      !autoQueueTriggered.current &&
      !ratingLoading &&
      !ratingError &&
      state === 'idle'
    ) {
      autoQueueTriggered.current = true
      navigate(ROUTES.PVP, { replace: true, state: null })
      joinQueue()
    }
  }, [location.state, ratingLoading, ratingError, state, joinQueue, navigate])

  const isSearching = state === 'queuing' || state === 'searching'
  const displayError = error || ratingError

  return (
    <>
      <PvpQueueOverlay
        visible={isSearching}
        queueTime={queueTime}
        onCancel={cancelQueue}
      />

      <div className="relative h-full px-6 py-6">
        {displayError && (
          <div className="absolute top-6 left-6 right-6 z-10">
            <div
              className="max-w-6xl mx-auto bg-error/10 border border-error/20 rounded-xl p-3 text-sm text-error"
              role="alert"
            >
              {displayError}
            </div>
          </div>
        )}

        <div className="flex h-full items-center justify-center">
          <PvpRankCard
            rating={rating}
            loading={ratingLoading}
            ratingError={!!ratingError}
            onPlayRanked={joinQueue}
          />
        </div>

        <div className="hidden xl:flex absolute right-6 top-0 bottom-0 items-center py-6">
          <div className="w-[380px] space-y-5 overflow-y-auto max-h-full">
            <PvpLeaderboard
              top={lbTop}
              currentUser={lbCurrentUser}
              loading={lbLoading}
              error={lbError}
              currentUserId={user?.id}
            />

            {user && (
              <PvpMatchHistory
                matches={matches}
                loading={historyLoading}
                error={historyError}
                currentUserId={user.id}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
