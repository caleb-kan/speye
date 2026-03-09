import type { CollapsedActivitySession } from '../services/getUserActivity'

export type ActivityStats = {
  totalTexts: number
  avgWpm: number
  avgScore: number
  currentStreak: number
  bestStreak: number
}

export const computeActivityStats = (
  sessions: CollapsedActivitySession[] | null,
  now: Date = new Date()
): ActivityStats => {
  if (!sessions || sessions.length === 0) {
    return {
      totalTexts: 0,
      avgWpm: 0,
      avgScore: 0,
      currentStreak: 0,
      bestStreak: 0,
    }
  }

  const totalTexts = sessions.length

  // Use the pre-calculated average_wpm from the collapsed session
  const validWpmSessions = sessions.filter((s) => s.average_wpm > 0)
  const avgWpm =
    validWpmSessions.length > 0
      ? Math.round(
          validWpmSessions.reduce((acc, curr) => acc + curr.average_wpm, 0) /
            validWpmSessions.length
        )
      : 0

  const scoredSessions = sessions.filter(
    (s) => s.score !== null && s.score !== undefined
  )

  const avgScore =
    scoredSessions.length > 0
      ? Math.round(
          scoredSessions.reduce((acc, curr) => acc + (curr.score ?? 0), 0) /
            scoredSessions.length
        )
      : 0

  // Streak Calculation - uses UTC ISO dates (YYYY-MM-DD) for reliable parsing
  const uniqueActiveDates = new Set<string>()

  sessions.forEach((session) => {
    if (session.end_time) {
      const dateStr = new Date(session.end_time).toISOString().split('T')[0]
      uniqueActiveDates.add(dateStr)
    }
  })

  // ISO date strings (YYYY-MM-DD) sort correctly with localeCompare
  const sortedDates = Array.from(uniqueActiveDates).sort((a, b) =>
    b.localeCompare(a)
  )

  let currentStreak = 0

  const today = now.toISOString().split('T')[0]
  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterday = yesterdayDate.toISOString().split('T')[0]

  if (sortedDates.length > 0) {
    const mostRecent = sortedDates[0]
    if (mostRecent === today || mostRecent === yesterday) {
      const checkDate = new Date(mostRecent + 'T00:00:00Z')
      for (const dateStr of sortedDates) {
        const expectedDateStr = checkDate.toISOString().split('T')[0]
        if (dateStr === expectedDateStr) {
          currentStreak++
          checkDate.setUTCDate(checkDate.getUTCDate() - 1)
        } else {
          break
        }
      }
    }
  }

  let bestStreak = 0
  let tempStreak = 0

  if (sortedDates.length > 0) {
    tempStreak = 1
    bestStreak = 1

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const currDate = new Date(sortedDates[i] + 'T00:00:00Z')
      const prevDay = new Date(currDate)
      prevDay.setUTCDate(prevDay.getUTCDate() - 1)

      if (sortedDates[i + 1] === prevDay.toISOString().split('T')[0]) {
        tempStreak++
      } else {
        bestStreak = Math.max(bestStreak, tempStreak)
        tempStreak = 1
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak)
  }

  return { totalTexts, avgWpm, avgScore, currentStreak, bestStreak }
}
