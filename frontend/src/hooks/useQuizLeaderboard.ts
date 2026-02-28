import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import {
  getTextLeaderboard,
  type LeaderboardEntry,
} from '../services/leaderboardService'
import { getAvatarUrl } from '../utils/getAvatarUrl'
import { getUsername } from '../utils/getUsername'
import { mergeLocalEntry } from '../utils/leaderboard'
import {
  LEADERBOARD_FETCH_DELAY_MS,
  LEADERBOARD_TOP_COUNT,
} from '../constants/quiz'
import { computeOverallScore } from '../../../lib/scoring'
import { useNetworkStatus } from './useNetworkStatus'

type UseQuizLeaderboardParams = {
  textId: string
  isPublic: boolean
  isSaving: boolean
  savedWpm: number | null
  score: number
}

type UseQuizLeaderboardResult = {
  topEntries: LeaderboardEntry[]
  currentUserEntry: LeaderboardEntry | null
  isLoading: boolean
  loadError: string | null
}

/**
 * Custom hook for managing quiz leaderboard state with optimistic updates.
 * Fetches leaderboard data and merges in the local entry if it's better than cached.
 */
export function useQuizLeaderboard({
  textId,
  isPublic,
  isSaving,
  savedWpm,
  score,
}: UseQuizLeaderboardParams): UseQuizLeaderboardResult {
  const { user } = useAuth()
  const userId = user?.id
  const { isOnline } = useNetworkStatus()

  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserEntry, setCurrentUserEntry] =
    useState<LeaderboardEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPublic || isSaving || !isOnline) return

    let isActive = true
    setIsLoading(true)
    setLoadError(null)

    const timer = setTimeout(async () => {
      try {
        const { top, currentUser } = await getTextLeaderboard(textId, userId)
        if (!isActive) return

        const localOverall =
          savedWpm != null && userId
            ? computeOverallScore(savedWpm, score)
            : null

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
            userId,
            username: getUsername(user ?? null) ?? null,
            avatarUrl: getAvatarUrl(user) ?? null,
            wpm: savedWpm!,
            quizScore: score,
            overallScore: localOverall,
            rank: 1,
          }

          const merged = mergeLocalEntry(top, localEntry, LEADERBOARD_TOP_COUNT)

          setTopEntries(merged.top)
          setCurrentUserEntry(merged.currentUser)
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
  }, [textId, isPublic, userId, isSaving, savedWpm, score, user, isOnline])

  return {
    topEntries,
    currentUserEntry,
    isLoading,
    loadError,
  }
}
