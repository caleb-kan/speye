import type { ActivitySession } from '../services/getUserActivity'

export type ActivitySessionsByDate = Record<string, ActivitySession[]>

export const groupActivitySessionsByDate = (
  sessions: ActivitySession[] | null,
  now: Date = new Date()
): ActivitySessionsByDate => {
  if (!sessions) return {}

  const today = now.toLocaleDateString()
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(now.getDate() - 1)
  const yesterday = yesterdayDate.toLocaleDateString()

  const groups: ActivitySessionsByDate = {}

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
