import { BookOpen, Target, Flame, Zap, Trophy } from 'lucide-react'
import { StatWidget } from './StatWidget'
import type { ActivityStats } from '../../utils/activityStats'

export type ActivityStatsGridProps = {
  stats: ActivityStats
}

export function ActivityStatsGrid({ stats }: ActivityStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
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
        label="Current Streak"
        value={stats.currentStreak}
        unit="Days"
        icon={Flame}
        delay={300}
        subValue={
          <div className="flex items-center gap-1.5 opacity-100 hover:opacity-80 transition-opacity">
            <Trophy className="w-5 h-5 text-warning fill-warning/20" />
            <span className="text-lg font-bold text-warning">
              {stats.bestStreak}
            </span>
          </div>
        }
      />
    </div>
  )
}
