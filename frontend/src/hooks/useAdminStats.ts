import { useCallback, useEffect, useState } from 'react'
import {
  getAdminStats,
  getUserTrend,
  type AdminStats,
  type UserTrendData,
} from '../services/adminService'

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [trend, setTrend] = useState<UserTrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const [statsData, trendData] = await Promise.all([
        getAdminStats(),
        getUserTrend(),
      ])

      setStats(statsData)
      setTrend(trendData)
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

  return { stats, trend, loading, error, refetch: fetchStats }
}
