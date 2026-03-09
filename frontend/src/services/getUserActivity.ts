import {
  getUserActivity as getUserActivityDb,
  type ActivitySession,
} from '../../../backend/supabase/database/userActivity/getUserActivity'
import { getErrorMessage } from '../utils/getErrorMessage'
import type { Mode } from '../types/reading'
import { DEFAULT_MODE } from '../constants/modes'
import { getCachedActivity, setCachedActivity } from './offlineCache'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'

const TAG = 'getUserActivity'

export type { ActivitySession }

export interface ActivitySegment {
  id: string
  wpm: number
  mode: Mode
  start_time: string
  end_time: string
  duration: number
}

export interface CollapsedActivitySession {
  id: string
  text_id: string
  text: {
    title: string | null
    fiction: boolean | null
    complexity: number | null
  } | null
  score: number | null
  end_time: string
  start_time: string
  average_wpm: number
  total_duration_seconds: number
  segments: ActivitySegment[]
}

const GROUPING_THRESHOLD_MS = 1000 * 60 * 5

function collapseSessions(
  rawSessions: ActivitySession[]
): CollapsedActivitySession[] {
  if (!rawSessions.length) return []

  const collapsed: CollapsedActivitySession[] = []

  const validSessions = rawSessions.filter(
    (s): s is ActivitySession & { end_time: string } => s.end_time !== null
  )
  if (!validSessions.length) return []

  const sortedSessions = [...validSessions].sort(
    (a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime()
  )

  let currentGroup: (ActivitySession & { end_time: string })[] = []

  for (let i = 0; i < sortedSessions.length; i++) {
    const session = sortedSessions[i]
    const prevInGroup =
      currentGroup.length > 0 ? currentGroup[currentGroup.length - 1] : null

    let shouldGroup = false

    if (prevInGroup) {
      const isSameText = session.text_id === prevInGroup.text_id

      const timeDiff = Math.abs(
        new Date(session.start_time || session.end_time).getTime() -
          new Date(prevInGroup.end_time).getTime()
      )
      const isCloseInTime = timeDiff < GROUPING_THRESHOLD_MS

      shouldGroup = isSameText && isCloseInTime
    } else {
      shouldGroup = true
    }

    if (shouldGroup) {
      currentGroup.push(session)
    } else {
      if (currentGroup.length > 0)
        collapsed.push(createCollapsedSession(currentGroup))
      currentGroup = [session]
    }
  }

  if (currentGroup.length > 0) {
    collapsed.push(createCollapsedSession(currentGroup))
  }

  return collapsed.reverse()
}

function createCollapsedSession(
  group: (ActivitySession & { end_time: string })[]
): CollapsedActivitySession {
  const firstEntry = group[0]
  const lastEntry = group[group.length - 1]

  let totalDuration = 0

  const segments: ActivitySegment[] = group.map((s) => {
    const start = new Date(s.start_time || s.end_time).getTime()
    const end = new Date(s.end_time).getTime()

    const durationSeconds = Math.max(1, (end - start) / 1000)
    totalDuration += durationSeconds

    return {
      id: s.id,
      wpm: s.wpm,
      mode: s.mode ?? DEFAULT_MODE,
      start_time: s.start_time || s.end_time,
      end_time: s.end_time,
      duration: durationSeconds,
    }
  })

  let weightedWpmSum = 0
  let totalWeight = 0

  segments.forEach((seg) => {
    weightedWpmSum += seg.wpm * seg.duration
    totalWeight += seg.duration
  })

  const weightedAvgWpm =
    totalWeight > 0
      ? Math.round(weightedWpmSum / totalWeight)
      : Math.round(segments.reduce((a, b) => a + b.wpm, 0) / segments.length)

  const scoreEntry = group.find(
    (s) => s.score !== null && s.score !== undefined
  )

  return {
    id: lastEntry.id,
    text_id: lastEntry.text_id,
    text: lastEntry.text,
    score: scoreEntry ? scoreEntry.score : null,

    // Session spans from start of first log to end of last log
    start_time: firstEntry.start_time || firstEntry.end_time,
    end_time: lastEntry.end_time,

    average_wpm: weightedAvgWpm,
    total_duration_seconds: totalDuration,
    segments: segments,
  }
}

export async function getUserActivity(
  userId: string
): Promise<CollapsedActivitySession[]> {
  if (!userId) {
    throw new Error('User ID is required')
  }

  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached activity', { userId })
    return (await getCachedActivity(userId)) ?? []
  }

  try {
    const rawData = await getUserActivityDb(userId)
    const collapsed = collapseSessions(rawData)
    void setCachedActivity(userId, collapsed)
    return collapsed
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for activity, falling back to cache',
      err
    )
    const cached = await getCachedActivity(userId)
    if (cached) return cached
    throw new Error(getErrorMessage(err, 'Failed to load activity'))
  }
}
