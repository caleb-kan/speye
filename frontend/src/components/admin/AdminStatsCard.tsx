import type { ReactNode } from 'react'
import { ChevronUp } from 'lucide-react'

interface SplitStat {
  label: string
  value: number
  color: string
}

interface AdminStatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: string
  trendUp?: boolean
  split?: [SplitStat, SplitStat]
  className?: string
}

export function AdminStatsCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  split,
  className = '',
}: AdminStatsCardProps) {
  // Calculate percentages safely
  let p1 = 0
  let p2 = 0
  if (split) {
    const total = split[0].value + split[1].value
    if (total > 0) {
      p1 = (split[0].value / total) * 100
      p2 = (split[1].value / total) * 100
    }
  }

  return (
    <div
      className={`relative group bg-bg-secondary/30 border border-text-secondary/10 rounded-2xl p-6 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:bg-bg-secondary/50 hover:border-text-secondary/20 ${className}`}
      style={{ minHeight: '150px' }}
    >
      {/* Hover Indicator (only shows if split data is provided) */}
      {split && (
        <div className="absolute top-4 right-4 text-text-secondary/20 group-hover:opacity-0 transition-opacity duration-300">
          <div className="animate-bounce">
            <ChevronUp size={16} />
          </div>
        </div>
      )}

      {/* Main Content Layer */}
      <div
        className={`transition-transform duration-300 ease-out ${split ? 'group-hover:-translate-y-2' : ''}`}
      >
        {/* Header: Icon & Trend */}
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary transition-colors group-hover:bg-primary/20">
            {icon}
          </div>
          {trend && (
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                trendUp
                  ? 'bg-success/10 text-success'
                  : 'bg-error/10 text-error'
              }`}
            >
              {trend}
            </span>
          )}
        </div>

        {/* Value & Title */}
        <div>
          <h3 className="text-3xl font-bold text-text mb-1 tracking-tight">
            {value}
          </h3>
          <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">
            {title}
          </p>
        </div>
      </div>

      {/* Split Data Overlay (slides up from bottom) */}
      {split && (
        <div className="absolute bottom-0 left-0 w-full px-6 py-5 bg-bg-secondary/95 backdrop-blur-md border-t border-text-secondary/10 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0">
          {/* Visual Bar */}
          <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-3 bg-bg shadow-inner">
            <div
              className={`h-full ${split[0].color}`}
              style={{ width: `${p1}%` }}
            />
            <div
              className={`h-full ${split[1].color}`}
              style={{ width: `${p2}%` }}
            />
          </div>

          {/* Legend / Labels */}
          <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wide">
            {/* Left Item */}
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${split[0].color}`}
                ></div>
                <span className="text-text-secondary">{split[0].label}</span>
              </div>
              <span className="text-text text-xs ml-3">{split[0].value}</span>
            </div>

            {/* Right Item */}
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-text-secondary">{split[1].label}</span>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${split[1].color}`}
                ></div>
              </div>
              <span className="text-text text-xs mr-3">{split[1].value}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
