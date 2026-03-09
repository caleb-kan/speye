import { Activity as ActivityIcon } from 'lucide-react'
import { SessionItem } from './SessionItem'
import type { CollapsedActivitySession } from '../../services/getUserActivity'
import type { ActivitySessionsByDate } from '../../utils/activityGrouping'

export type ActivityFeedProps = {
  sessions: CollapsedActivitySession[] | null
  groupedSessions: ActivitySessionsByDate<CollapsedActivitySession>
}

export function ActivityFeed({ sessions, groupedSessions }: ActivityFeedProps) {
  return (
    <div className="space-y-12 pb-10">
      {!sessions || sessions.length === 0 ? (
        <div className="text-center py-20 bg-text-secondary/10 rounded-3xl border border-text-secondary/10 border-dashed">
          <ActivityIcon className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-50" />
          <p className="text-text font-medium">No activity yet</p>
          <p className="text-text-secondary text-sm mt-1">
            Complete a reading session to see your stats here.
          </p>
        </div>
      ) : (
        Object.entries(groupedSessions).map(
          ([dateLabel, groupSessions], groupIndex) => {
            return (
              <div
                key={dateLabel}
                className="group/timeline relative flex flex-col md:flex-row gap-2 md:gap-0 animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards"
                style={{ animationDelay: `${400 + groupIndex * 100}ms` }}
              >
                <div className="md:w-24 md:mr-4 shrink-0 flex flex-col md:items-end">
                  <div className="sticky top-8 flex flex-col md:items-end">
                    <div
                      className="
                      px-3 py-1.5 rounded-lg
                      bg-bg-secondary/50 backdrop-blur-md border border-text-secondary/10
                      text-sm font-bold text-text-secondary uppercase tracking-wider
                      shadow-sm mb-1
                    "
                    >
                      {dateLabel}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-center w-3 mr-6">
                  <div className="w-3 h-3 rounded-full bg-bg border-2 border-text-secondary/20 group-hover/timeline:border-primary/50 group-hover/timeline:bg-primary/20 transition-colors duration-300 shrink-0 mt-2" />
                  <div className="flex-1 w-px bg-gradient-to-b from-text-secondary/20 via-text-secondary/10 to-transparent" />
                </div>

                <div className="flex-1 min-w-0 space-y-3 sm:space-y-2">
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
          }
        )
      )}
    </div>
  )
}
