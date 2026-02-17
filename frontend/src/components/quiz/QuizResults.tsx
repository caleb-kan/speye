import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getTextLeaderboard,
  type LeaderboardEntry,
} from '../../services/leaderboardService'
import { CircularProgress } from './CircularProgress'
import { LeaderboardTable } from './LeaderboardTable'
import { useAuth } from '../../hooks/useAuth'
import {
  SCORE_ANIMATION_DURATION_MS,
  LEADERBOARD_FETCH_DELAY_MS,
  FULL_SCREEN_SCORE_SIZE,
  PRIVATE_SCORE_SIZE,
  PUBLIC_SCORE_SIZE,
  LEADERBOARD_TOP_COUNT,
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
}: Props) {
  const { user } = useAuth()
  const userId = user?.id
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserEntry, setCurrentUserEntry] =
    useState<LeaderboardEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'score' | 'details'>('score')

  const isPublic = ownerId === null
  const canShowLeaderboard = isPublic && userId != null

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('details')
    }, SCORE_ANIMATION_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!canShowLeaderboard || isSaving) return

    let isActive = true
    setIsLoading(true)
    setLoadError(null)

    const timer = setTimeout(async () => {
      try {
        const { top, currentUser } = await getTextLeaderboard(textId, userId)
        if (!isActive) return

        const localOverall =
          savedWpm != null && userId ? savedWpm * score : null

        const existingInTop = userId
          ? top.find((e) => e.userId === userId)
          : undefined
        const existingEntry = existingInTop ?? currentUser

        const shouldUseLocal =
          userId != null &&
          localOverall != null &&
          (!existingEntry || localOverall > existingEntry.overallScore)

        if (shouldUseLocal) {
          const localEntry: LeaderboardEntry = {
            userId: userId,
            wpm: savedWpm!,
            quizScore: score,
            overallScore: localOverall,
            rank: 1,
          }

          const others = top.filter((e) => e.userId !== userId)
          const merged = [...others, localEntry].sort(
            (a, b) => b.overallScore - a.overallScore
          )
          merged.forEach((e, i) => (e.rank = i + 1))

          const userIdx = merged.findIndex((e) => e.userId === userId)
          if (userIdx < LEADERBOARD_TOP_COUNT) {
            setTopEntries(merged.slice(0, LEADERBOARD_TOP_COUNT))
            setCurrentUserEntry(null)
          } else {
            setTopEntries(merged.slice(0, LEADERBOARD_TOP_COUNT))
            setCurrentUserEntry(merged[userIdx])
          }
        } else {
          setTopEntries(top)
          setCurrentUserEntry(currentUser)
        }
      } catch (err) {
        if (!isActive) return
        const message =
          err instanceof Error ? err.message : 'Failed to load leaderboard'
        setLoadError(message)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }, LEADERBOARD_FETCH_DELAY_MS)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [textId, canShowLeaderboard, userId, isSaving, savedWpm, score])

  // Full-screen circular score animation
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
        {/* Left Column: Leaderboard (public + signed-in) or Score */}
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

        {/* Right Column: Stats + Close */}
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="space-y-2">
            <h2 className="text-3xl font-medium tracking-tight text-text">
              Quiz Complete
            </h2>
            <p className="text-text-secondary text-lg">
              Great effort! Here is how you performed.
            </p>
          </div>

          {/* Stats */}
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

          {/* Action Button */}
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
