import { BookOpen, Target, Trophy, Zap } from 'lucide-react'
import { StatWidget } from './StatWidget'
import type { ActivityStats } from '../../utils/activityStats'

export type ActivityStatsGridProps = {
  stats: ActivityStats
}

export function ActivityStatsGrid({ stats }: ActivityStatsGridProps) {
  return (
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
  )
}
