import type { ActivitySession } from '../services/getUserActivity'

interface SessionWithTime {
  end_time?: string | null
}

export type ActivitySessionsByDate<T = ActivitySession> = Record<string, T[]>

export const groupActivitySessionsByDate = <T extends SessionWithTime>(
  sessions: T[] | null,
  now: Date = new Date()
): ActivitySessionsByDate<T> => {
  if (!sessions) return {}

  const today = now.toLocaleDateString()

  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(now.getDate() - 1)
  const yesterday = yesterdayDate.toLocaleDateString()

  const groups: ActivitySessionsByDate<T> = {}

  sessions.forEach((session) => {
    const dateStr = session.end_time || now.toISOString()
    const date = new Date(dateStr).toLocaleDateString()

    let label = date
    if (date === today) label = 'Today'
    else if (date === yesterday) label = 'Yesterday'

    if (!groups[label]) groups[label] = []

    groups[label].push(session)
  })

  return groups
}
