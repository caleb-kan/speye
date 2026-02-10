import type { ActivitySession } from '../services/getUserActivity'

export type ActivityStats = {
  totalTexts: number
  avgWpm: number
  avgScore: number
  streak: number
}

export const computeActivityStats = (
  sessions: ActivitySession[] | null
): ActivityStats => {
  if (!sessions || sessions.length === 0) {
    return { totalTexts: 0, avgWpm: 0, avgScore: 0, streak: 0 }
  }

  const totalTexts = sessions.length

  const validWpmSessions = sessions.filter((s) => s.wpm > 0)
  const avgWpm =
    validWpmSessions.length > 0
      ? Math.round(
          validWpmSessions.reduce((acc, curr) => acc + curr.wpm, 0) /
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

  const streak = 0

  return { totalTexts, avgWpm, avgScore, streak }
}
