import { useState, useEffect } from 'react'
import { Zap, Clock, FileQuestion, ChevronDown, Activity } from 'lucide-react'
import type { CollapsedActivitySession } from '../../services/getUserActivity'
import { TimelineGraph } from './TimelineGraph'

const HIGH_SCORE_THRESHOLD = 80

type Props = {
  session: CollapsedActivitySession
  index: number
}

export function SessionItem({ session, index }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [overflowVisible, setOverflowVisible] = useState(false)

  const dateStr = session.end_time || new Date().toISOString()
  const date = new Date(dateStr)

  const hasScore = session.score !== null && session.score !== undefined
  const isHighScore = hasScore && session.score! >= HIGH_SCORE_THRESHOLD
  const textExists = !!session.text
  const hasSegments = session.segments && session.segments.length > 0

  useEffect(() => {
    if (isExpanded) {
      const timeout = setTimeout(() => setOverflowVisible(true), 550)
      return () => clearTimeout(timeout)
    }
  }, [isExpanded])

  return (
    <div
      className={`
        group flex flex-col p-4 rounded-2xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/5 animate-in slide-in-from-bottom-4 fade-in fill-mode-backwards
        ${isExpanded ? 'bg-white/5 border-white/5 z-20 relative' : 'z-0'} 
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* --- Top Header (Key Information) --- */}
      <div
        className="relative z-10 flex items-center gap-4 w-full cursor-pointer"
        onClick={() => {
          if (hasSegments) {
            setIsExpanded((prev) => {
              if (prev) setOverflowVisible(false)
              return !prev
            })
          }
        }}
      >
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-bg-secondary border border-white/5 text-text-secondary shrink-0 transition-colors group-hover:bg-white/5">
          <span className="text-xs font-bold uppercase">
            {date.toLocaleString('default', { month: 'short' })}
          </span>
          <span className="text-lg font-bold text-text">{date.getDate()}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {textExists ? (
              <>
                <h4 className="font-medium text-text truncate group-hover:text-primary transition-colors">
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
              {session.average_wpm || 0} WPM (Avg)
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {hasSegments && (
              <button
                className={`
                  flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all duration-300
                  ${
                    isExpanded
                      ? 'bg-primary/20 text-primary ring-1 ring-primary/20'
                      : 'bg-white/5 text-text-secondary/70 hover:text-text-secondary hover:bg-white/10'
                  }
                `}
              >
                <Activity className="w-3 h-3" />
                <span className="text-[10px] font-medium">
                  {session.segments.length} segments
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 min-w-[3.5rem]">
          {hasScore ? (
            <>
              <div
                className={`text-xl font-bold tracking-tight ${isHighScore ? 'text-primary' : 'text-text'}`}
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
                <span className="tracking-widest">-</span>
              </div>
              <div className="text-[10px] text-text-secondary uppercase">
                No Quiz
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Expandable --- */}
      <div
        className={`
          grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative
          ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
        `}
      >
        <div
          className={`min-h-0 ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}
        >
          <div className="pt-4 mt-4 border-t border-white/5">
            <TimelineGraph
              segments={session.segments}
              totalDuration={session.total_duration_seconds}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
