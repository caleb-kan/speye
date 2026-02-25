import { useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAsyncOperation } from '../hooks/useAsyncOperation'
// Import the NEW type
import {
  getUserActivity,
  type CollapsedActivitySession,
} from '../services/getUserActivity'

import { computeActivityStats } from '../utils/activityStats'
import { groupActivitySessionsByDate } from '../utils/activityGrouping'
import { ActivityHeader } from '../components/activity/ActivityHeader'
import { ActivityStatsGrid } from '../components/activity/ActivityStatsGrid'
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

  useEffect(() => {
    if (user) {
      execute(() => getUserActivity(user.id))
    }
  }, [user, execute])

  const stats = useMemo(() => computeActivityStats(sessions), [sessions])
  const groupedSessions = useMemo(
    () => groupActivitySessionsByDate(sessions),
    [sessions]
  )

  if (error) {
    return <ActivityErrorState />
  }

  if (loading && !sessions) {
    return <ActivitySkeleton />
  }

  return (
    <div className="flex flex-1 flex-col items-center w-full px-4 sm:px-6 py-6 custom-scrollbar">
      <div className="w-full max-w-5xl space-y-10">
        <ActivityHeader />
        <ActivityStatsGrid stats={stats} />
        <ActivityFeed sessions={sessions} groupedSessions={groupedSessions} />
      </div>
    </div>
  )
}
