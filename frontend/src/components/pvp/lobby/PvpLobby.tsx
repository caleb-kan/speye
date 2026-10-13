import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { PvpRankCard } from './PvpRankCard'
import { PvpLeaderboard } from './PvpLeaderboard'
import { PvpMatchHistory } from './PvpMatchHistory'
import { PvpQueueOverlay } from './PvpQueueOverlay'
import { EloHistory } from './EloHistory'
import { UserSearchBar } from './UserSearchBar'
import { usePvpRating } from '../../../hooks/usePvpRating'
import { usePvpLeaderboard } from '../../../hooks/usePvpLeaderboard'
import { usePvpMatchHistory } from '../../../hooks/usePvpMatchHistory'
import { usePvpMatchmaking } from '../../../hooks/usePvpMatchmaking'
import { useAuth } from '../../../hooks/useAuth'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { ROUTES } from '../../../utils/routes'
import { getRankFromElo } from '../../../utils/pvp'
import type { PvpLeaderboardEntry } from '../../../types/database'

export function PvpLobby() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const autoQueueTriggered = useRef(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchedUser, setSearchedUser] = useState<{
    id: string
    username: string | null
  } | null>(null)
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null)

  const selectedUserIdOrDefault = selectedUserId ?? user?.id ?? null

  const {
    rating: currentUserRating,
    loading: currentUserRatingLoading,
    error: currentUserRatingError,
  } = usePvpRating()

  const { rating } = usePvpRating(selectedUserIdOrDefault)
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
  } = usePvpMatchHistory(selectedUserIdOrDefault)

  const { state, gameId, queueTime, error, joinQueue, cancelQueue } =
    usePvpMatchmaking(currentUserRating?.elo_rating ?? null)

  const displayError = error || currentUserRatingError

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
      !currentUserRatingLoading &&
      !currentUserRatingError &&
      state === 'idle'
    ) {
      autoQueueTriggered.current = true
      navigate(ROUTES.PVP, { replace: true, state: null })
      joinQueue()
    }
  }, [
    location.state,
    currentUserRatingLoading,
    currentUserRatingError,
    state,
    joinQueue,
    navigate,
  ])

  const isSearching =
    state === 'queuing' || state === 'searching' || state === 'canceling'

  const handleSelectUser = (entry: PvpLeaderboardEntry) => {
    setHoveredMatchId(null)
    setSelectedUserId(entry.user_id)
    setSearchedUser({ id: entry.user_id, username: entry.username })
  }

  const handleLeaderboardSelectUser = (userId: string) => {
    setHoveredMatchId(null)
    setSelectedUserId(userId)
    if (searchedUser?.id !== userId) {
      setSearchedUser(null)
    }
  }

  const selectedUsername = selectedUserIdOrDefault
    ? ((searchedUser?.id === selectedUserIdOrDefault
        ? searchedUser.username
        : null) ??
      lbTop.find((entry) => entry.user_id === selectedUserIdOrDefault)
        ?.username ??
      (lbCurrentUser?.user_id === selectedUserIdOrDefault
        ? lbCurrentUser.username
        : user?.id === selectedUserIdOrDefault
          ? 'You'
          : null))
    : null

  const selectedRank =
    rating?.elo_rating !== null && rating?.elo_rating !== undefined
      ? getRankFromElo(rating.elo_rating)
      : null

  return (
    <>
      <PvpQueueOverlay
        visible={isSearching}
        queueTime={queueTime}
        canceling={state === 'canceling'}
        onCancel={cancelQueue}
      />

      <div
        className={`relative w-full px-4 sm:px-6 py-6 ${isMobile ? '' : 'pl-20 sm:pl-20'}`}
      >
        {displayError && (
          <div className="mb-6">
            <div
              className="max-w-6xl mx-auto bg-error/10 border border-error/20 rounded-xl p-3 text-sm text-error"
              role="alert"
            >
              {displayError}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)_minmax(0,380px)] items-start gap-6">
          <div className="flex min-w-0 flex-col items-start xl:py-6 gap-5">
            <div className="w-full">
              <UserSearchBar onUserFound={handleSelectUser} />
            </div>

            {selectedUserIdOrDefault && (
              <div className="w-full h-[480px] xl:h-[600px] bg-bg-secondary/50 border border-text-secondary/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 pb-0">
                  <EloHistory
                    matches={matches}
                    loading={historyLoading}
                    error={historyError}
                    username={selectedUsername}
                    rank={selectedRank}
                    currentElo={rating?.elo_rating ?? null}
                    onHoverMatchId={setHoveredMatchId}
                  />
                </div>

                <div className="border-t border-text-secondary/10 flex-1 overflow-hidden flex flex-col mt-4">
                  <PvpMatchHistory
                    matches={matches}
                    loading={historyLoading}
                    error={historyError}
                    currentUserId={selectedUserIdOrDefault}
                    currentUsername={selectedUsername}
                    hoveredMatchId={hoveredMatchId}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="order-first lg:col-span-2 xl:order-none xl:col-span-1 flex min-w-0 items-center justify-center xl:self-center">
            <PvpRankCard
              rating={currentUserRating}
              loading={currentUserRatingLoading}
              ratingError={!!currentUserRatingError}
              onPlayPvp={joinQueue}
            />
          </div>

          <div className="flex min-w-0 items-start xl:py-6">
            <div className="w-full">
              <PvpLeaderboard
                top={lbTop}
                currentUser={lbCurrentUser}
                loading={lbLoading}
                error={lbError}
                currentUserId={user?.id}
                onSelectUser={handleLeaderboardSelectUser}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
