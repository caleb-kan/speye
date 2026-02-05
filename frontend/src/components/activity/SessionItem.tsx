import { Zap, Clock, FileQuestion } from 'lucide-react'
import type { ActivitySession } from '../../services/getUserActivity'

type Props = {
  session: ActivitySession
  index: number
}

export function SessionItem({ session, index }: Props) {
  const dateStr = session.time_completed || new Date().toISOString()
  const date = new Date(dateStr)

  const hasScore = session.score !== null && session.score !== undefined
  const isHighScore = hasScore && session.score! >= 80

  // Check if the text object exists
  const textExists = !!session.text

  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/5 animate-in slide-in-from-bottom-4 fade-in fill-mode-backwards"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Date Box */}
      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-bg-secondary border border-white/5 text-text-secondary shrink-0">
        <span className="text-xs font-bold uppercase">
          {date.toLocaleString('default', { month: 'short' })}
        </span>
        <span className="text-lg font-bold text-text">{date.getDate()}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {textExists ? (
            <>
              <h4 className="font-medium text-text truncate">
                {session.text!.title}
              </h4>
              {session.text!.fiction !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold ${
                    session.text!.fiction
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {session.text!.fiction ? 'Fiction' : 'Non-Fic'}
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-text-secondary/50 group-hover:text-text-secondary transition-colors">
              <FileQuestion className="w-4 h-4" />
              <span className="italic font-medium text-sm">Text Deleted</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {session.wpm || 0} WPM
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {date.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Score / Status Section */}
      <div className="text-right shrink-0 min-w-[3.5rem]">
        {hasScore ? (
          <>
            <div
              className={`text-xl font-bold tracking-tight ${
                isHighScore ? 'text-primary' : 'text-text'
              }`}
            >
              {session.score}%
            </div>
            <div className="text-[10px] text-text-secondary uppercase">
              Score
            </div>
          </>
        ) : (
          <div className="opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="text-xl font-bold tracking-tight text-text-secondary font-mono flex justify-end">
              <span className="tracking-widest">—</span>
            </div>
            <div className="text-[10px] text-text-secondary uppercase">
              No Quiz
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
