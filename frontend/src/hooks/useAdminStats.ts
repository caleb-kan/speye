import { useCallback, useEffect, useState } from 'react'
import {
  getAdminQuizStats,
  getAdminWpmDistribution,
  getAdminStats,
  getUserTrend,
  type AdminStats,
  type UserTrendData,
  type WpmStats,
  type AdminQuizStats,
} from '../services/adminService'

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [trend, setTrend] = useState<UserTrendData[]>([])
  const [quizStats, setQuizStats] = useState<AdminQuizStats | null>(null)
  const [wpmStats, setWpmStats] = useState<WpmStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const [statsData, trendData, quizStatsData, wpmStatsData] =
        await Promise.all([
          getAdminStats(),
          getUserTrend(),
          getAdminQuizStats(),
          getAdminWpmDistribution(),
        ])

      setStats(statsData)
      setTrend(trendData)
      setQuizStats(quizStatsData)
      setWpmStats(wpmStatsData)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
      setError('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  return {
    stats,
    trend,
    quizStats,
    wpmStats,
    loading,
    error,
    refetch: fetchStats,
  }
}
