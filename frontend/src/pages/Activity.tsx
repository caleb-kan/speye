import { useEffect, useMemo } from 'react'
import {
  Activity as ActivityIcon,
  Calendar,
  Zap,
  Target,
  BookOpen,
  Trophy,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAsyncOperation } from '../hooks/useAsyncOperation'
import {
  getUserActivity,
  type ActivitySession,
} from '../services/getUserActivity'

import { StatWidget } from '../components/activity/StatWidget'
import { SessionItem } from '../components/activity/SessionItem'

interface ActivityStats {
  totalTexts: number
  avgWpm: number
  avgScore: number
  streak: number
}

export function Activity() {
  const { user } = useAuth()
  const {
    data: sessions,
    loading,
    error,
    execute,
  } = useAsyncOperation<ActivitySession[]>()

  useEffect(() => {
    if (user) {
      execute(() => getUserActivity(user.id))
    }
  }, [user, execute])

  const stats: ActivityStats = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { totalTexts: 0, avgWpm: 0, avgScore: 0, streak: 0 }
    }

    const totalTexts = sessions.length
    const avgWpm = Math.round(
      sessions.reduce((acc, curr) => acc + (curr.wpm || 0), 0) / totalTexts
    )
    const avgScore = Math.round(
      sessions.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalTexts
    )
    const streak = 1 // Placeholder logic (TODO: Implement actual streak calculation)

    return { totalTexts, avgWpm, avgScore, streak }
  }, [sessions])

  const groupedSessions = useMemo(() => {
    if (!sessions) return {}

    const now = new Date()
    const today = now.toLocaleDateString()

    const yesterdayDate = new Date(now)
    yesterdayDate.setDate(now.getDate() - 1)
    const yesterday = yesterdayDate.toLocaleDateString()

    const groups: Record<string, ActivitySession[]> = {}

    sessions.forEach((session) => {
      const dateStr = session.time_completed || new Date().toISOString()
      const date = new Date(dateStr).toLocaleDateString()

      let label = date
      if (date === today) label = 'Today'
      else if (date === yesterday) label = 'Yesterday'

      if (!groups[label]) groups[label] = []
      groups[label].push(session)
    })

    return groups
  }, [sessions])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-error">
        <p className="font-bold">Failed to load activity</p>
      </div>
    )
  }

  if (loading && !sessions) {
    return (
      <div className="flex-1 flex flex-col items-center w-full px-8 py-10">
        <div className="w-full max-w-5xl animate-pulse space-y-8">
          <div className="h-8 w-48 bg-white/5 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-3xl" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-20 bg-white/5 rounded-2xl" />
            <div className="h-20 bg-white/5 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center w-full px-6 py-8 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-5xl space-y-10">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text">
              Activity
            </h1>
            <p className="text-text-secondary mt-1">
              Track your speed reading progress and comprehension.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <Calendar className="w-4 h-4" />
            <span>Last 30 Days</span>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatWidget
            label="Avg Speed"
            value={stats.avgWpm}
            unit="WPM"
            icon={Zap}
            delay={0}
          />
          <StatWidget
            label="Avg Score"
            value={stats.avgScore}
            unit="%"
            icon={Target}
            delay={100}
          />
          <StatWidget
            label="Texts Read"
            value={stats.totalTexts}
            icon={BookOpen}
            delay={200}
          />
          <StatWidget
            label="Best Streak"
            value={stats.streak}
            unit="Days"
            icon={Trophy}
            delay={300}
          />
        </div>

        {/* Activity Feed/List */}
        <div className="space-y-8">
          {!sessions || sessions.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
              <ActivityIcon className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-50" />
              <p className="text-text font-medium">No activity yet</p>
              <p className="text-text-secondary text-sm mt-1">
                Complete a reading session to see your stats here.
              </p>
            </div>
          ) : (
            Object.entries(groupedSessions).map(
              ([dateLabel, groupSessions], groupIndex) => (
                <div
                  key={dateLabel}
                  className="animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards"
                  style={{ animationDelay: `${400 + groupIndex * 100}ms` }}
                >
                  <h3 className="text-sm font-medium text-text-secondary uppercase tracking-widest mb-4 pl-2 sticky top-0 bg-bg/95 backdrop-blur-sm py-2 z-10 w-fit rounded-r-lg">
                    {dateLabel}
                  </h3>
                  <div className="space-y-2">
                    {groupSessions.map((session, i) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  )
}
