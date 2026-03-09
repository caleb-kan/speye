import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircularProgress } from './CircularProgress'
import { LeaderboardTable } from './LeaderboardTable'
import { useAuth } from '../../hooks/useAuth'
import { useQuizLeaderboard } from '../../hooks/useQuizLeaderboard'
import {
  SCORE_ANIMATION_DURATION_MS,
  FULL_SCREEN_SCORE_SIZE,
  PRIVATE_SCORE_SIZE,
  PUBLIC_SCORE_SIZE,
} from '../../constants/quiz'

type Props = {
  score: number
  correctCount: number
  totalCount: number
  textId: string
  ownerId: string | null
  onClose: () => void
  isSaving: boolean
  savedWpm: number | null
  saveError?: boolean
}

export function QuizResults({
  score,
  correctCount,
  totalCount,
  textId,
  ownerId,
  onClose,
  isSaving,
  savedWpm,
  saveError,
}: Props) {
  const { user } = useAuth()
  const userId = user?.id
  const [phase, setPhase] = useState<'score' | 'details'>('score')

  const isPublic = ownerId === null
  const canShowLeaderboard = isPublic && userId != null

  const { topEntries, currentUserEntry, isLoading, loadError } =
    useQuizLeaderboard({
      textId,
      isPublic,
      isSaving,
      savedWpm,
      score,
    })

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('details')
    }, SCORE_ANIMATION_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  if (phase === 'score') {
    return (
      <div className="flex items-center justify-center p-8 min-h-100">
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <CircularProgress percentage={score} size={FULL_SCREEN_SCORE_SIZE} />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-4">
        <div className="flex flex-col items-center justify-center space-y-6 border-r border-text-secondary/10 pr-6 md:pr-12">
          {canShowLeaderboard ? (
            <div className="w-full animate-in fade-in zoom-in-95 duration-500">
              <LeaderboardTable
                topEntries={topEntries}
                currentUserEntry={currentUserEntry}
                currentUserId={userId}
                isLoading={isLoading}
                loadError={loadError}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3">
              {isPublic && userId == null && (
                <p className="text-sm text-text-secondary text-center max-w-xs">
                  Want to stack up against the world?
                  <br />
                  <Link
                    to="/login"
                    className="text-primary hover:underline transition-colors"
                  >
                    Sign in
                  </Link>{' '}
                  to unlock the leaderboard!
                </p>
              )}
              <CircularProgress percentage={score} size={PRIVATE_SCORE_SIZE} />
            </div>
          )}
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="space-y-2">
            <h2 className="text-3xl font-medium tracking-tight text-text">
              Quiz Complete
            </h2>
            <p className="text-text-secondary text-lg">
              Great effort! Here is how you performed.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-bg-secondary/50 rounded-2xl p-5 border border-text-secondary/10 flex-1">
              <div className="text-text-secondary text-sm mb-1">Correct</div>
              <div className="text-2xl font-semibold text-text">
                {correctCount}{' '}
                <span className="text-text-secondary text-lg">
                  / {totalCount}
                </span>
              </div>
            </div>

            {canShowLeaderboard && (
              <div className="shrink-0">
                <CircularProgress percentage={score} size={PUBLIC_SCORE_SIZE} />
              </div>
            )}
          </div>

          {saveError && (
            <p className="text-error text-sm">
              Failed to save your result. Please try again later.
            </p>
          )}

          <div className="pt-4">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="
                w-full py-4 rounded-xl
                bg-text text-bg
                font-bold text-base tracking-wide
                hover:bg-text/90 hover:scale-[1.02]
                active:scale-[0.98]
                transition-all duration-200
                shadow-lg shadow-text/5
              "
            >
              {userId ? 'Save & Close' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
