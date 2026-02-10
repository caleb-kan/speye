import { Activity as ActivityIcon } from 'lucide-react'
import { SessionItem } from './SessionItem'
import type { ActivitySession } from '../../services/getUserActivity'
import type { ActivitySessionsByDate } from '../../utils/activityGrouping'

export type ActivityFeedProps = {
  sessions: ActivitySession[] | null
  groupedSessions: ActivitySessionsByDate
}

export function ActivityFeed({ sessions, groupedSessions }: ActivityFeedProps) {
  return (
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
                {groupSessions.map((session, index) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )
        )
      )}
    </div>
  )
}
