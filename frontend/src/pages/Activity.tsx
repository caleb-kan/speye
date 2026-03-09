import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAsyncOperation } from '../hooks/useAsyncOperation'
import {
  getUserActivity,
  type CollapsedActivitySession,
} from '../services/getUserActivity'

import { groupActivitySessionsByDate } from '../utils/activityGrouping'
import {
  ActivityHeader,
  type Timeframe,
} from '../components/activity/ActivityHeader'
import { ActivityDashboard } from '../components/activity/ActivityDashboard'
import { ActivityFeed } from '../components/activity/ActivityFeed'
import { ActivitySkeleton } from '../components/activity/ActivitySkeleton'
import { ActivityErrorState } from '../components/activity/ActivityErrorState'

export function Activity() {
  const { user } = useAuth()
  const {
    data: sessions,
    loading,
    error,
    execute,
  } = useAsyncOperation<CollapsedActivitySession[]>()

  const [timeframe, setTimeframe] = useState<Timeframe>('30D')
  const [isVerifiedMode, setIsVerifiedMode] = useState(false)

  useEffect(() => {
    if (user) execute(() => getUserActivity(user.id))
  }, [user, execute])

  const filteredSessions = useMemo(() => {
    if (!sessions) return null
    const cutoff = new Date()
    if (timeframe === '7D') cutoff.setDate(cutoff.getDate() - 7)
    if (timeframe === '30D') cutoff.setDate(cutoff.getDate() - 30)
    if (timeframe === 'ALL') cutoff.setTime(0)

    return sessions.filter((s) => new Date(s.end_time || 0) >= cutoff)
  }, [sessions, timeframe])

  const groupedSessions = useMemo(
    () => groupActivitySessionsByDate(filteredSessions),
    [filteredSessions]
  )

  if (error) return <ActivityErrorState />
  if (loading && !sessions) return <ActivitySkeleton />

  return (
    <div className="flex flex-1 flex-col items-center w-full px-4 sm:px-6 py-6 pb-12 bg-bg min-h-0 overflow-y-auto">
      <div className="w-full max-w-6xl space-y-6 animate-in fade-in duration-500">
        <ActivityHeader
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          isVerifiedMode={isVerifiedMode}
          setIsVerifiedMode={setIsVerifiedMode}
        />

        <ActivityDashboard
          sessions={filteredSessions}
          isVerifiedMode={isVerifiedMode}
        />

        <div className="mt-10 pt-8 border-t border-text-secondary/10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg px-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Reading Log
          </div>
          <ActivityFeed
            sessions={filteredSessions}
            groupedSessions={groupedSessions}
          />
        </div>
      </div>
    </div>
  )
}
