import { useMemo } from 'react'
import { Zap, Target, BookOpen, Flame, Trophy } from 'lucide-react'
import { StatWidget } from './StatWidget'
import { ActivityMetricsWidget } from './ActivityMetricsWidget'
import type { CollapsedActivitySession } from '../../services/getUserActivity'
import { computeActivityStats } from '../../utils/activityStats'
import { VERIFIED_SCORE_THRESHOLD } from '../../constants/admin'

interface Props {
  sessions: CollapsedActivitySession[] | null
  isVerifiedMode: boolean
}

export function ActivityDashboard({ sessions, isVerifiedMode }: Props) {
  const { stats, chartData } = useMemo(() => {
    if (!sessions) return { stats: computeActivityStats([]), chartData: [] }

    const activeSessions = isVerifiedMode
      ? sessions.filter(
          (s) => s.score !== null && s.score >= VERIFIED_SCORE_THRESHOLD
        )
      : sessions

    const currentStats = computeActivityStats(activeSessions)

    const daily = new Map<
      string,
      { wpmSum: number; wpmCount: number; scoreSum: number; scoreCount: number }
    >()
    const sorted = [...activeSessions].reverse()

    sorted.forEach((s) => {
      const dateStr = new Date(s.end_time || 0)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        .toUpperCase()

      if (!daily.has(dateStr)) {
        daily.set(dateStr, {
          wpmSum: 0,
          wpmCount: 0,
          scoreSum: 0,
          scoreCount: 0,
        })
      }

      const day = daily.get(dateStr)!
      if (s.average_wpm > 0) {
        day.wpmSum += s.average_wpm
        day.wpmCount++
      }
      if (s.score !== null && s.score !== undefined) {
        day.scoreSum += s.score
        day.scoreCount++
      }
    })

    const data = Array.from(daily.entries()).map(([dateStr, d]) => ({
      dateStr,
      wpm: d.wpmCount ? Math.round(d.wpmSum / d.wpmCount) : null,
      score: d.scoreCount ? Math.round(d.scoreSum / d.scoreCount) : null,
    }))

    return { stats: currentStats, chartData: data }
  }, [sessions, isVerifiedMode])

  return (
    <div className="w-full relative animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:grid-rows-2">
        <div className="col-span-2 lg:col-span-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 h-full min-h-[260px] lg:min-h-[300px] order-first lg:order-none z-10">
          <ActivityMetricsWidget
            data={chartData}
            wpmAvg={stats.avgWpm}
            scoreAvg={stats.avgScore}
            className="h-full shadow-sm"
          />
        </div>

        <StatWidget
          label="Avg Speed"
          value={stats.avgWpm}
          unit="WPM"
          icon={Zap}
          className="col-span-1 lg:col-start-1 lg:row-start-1 order-2 lg:order-none"
        />

        <StatWidget
          label="Avg Score"
          value={stats.avgScore}
          unit="%"
          icon={Target}
          className="col-span-1 lg:col-start-4 lg:row-start-1 order-3 lg:order-none"
        />

        <StatWidget
          label={isVerifiedMode ? 'Verified Texts' : 'Texts Read'}
          value={stats.totalTexts}
          icon={BookOpen}
          className="col-span-1 lg:col-start-1 lg:row-start-2 order-4 lg:order-none"
        />

        <StatWidget
          label="Current Streak"
          value={stats.currentStreak}
          unit="Days"
          icon={Flame}
          className="col-span-1 lg:col-start-4 lg:row-start-2 order-5 lg:order-none"
          subValue={
            <div className="flex items-center gap-1 opacity-90 transition-opacity">
              <Trophy className="w-3 h-3 text-warning fill-warning/20" />
              <span className="text-warning">{stats.bestStreak} Best</span>
            </div>
          }
        />
      </div>
    </div>
  )
}
