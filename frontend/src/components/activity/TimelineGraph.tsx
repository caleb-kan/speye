import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import type { ActivitySegment } from '../../services/getUserActivity'

export function TimelineGraph({
  segments,
  totalDuration,
}: {
  segments: ActivitySegment[]
  totalDuration: number
}) {
  const safeTotal = totalDuration > 0 ? totalDuration : 1
  const maxWpm = useMemo(() => {
    const max = Math.max(...segments.map((s) => s.wpm), 0)
    return Math.max(max, 100)
  }, [segments])

  return (
    <div className="w-full bg-white/5 rounded-xl border border-white/5 p-3 flex flex-col gap-2">
      {/* Header / Legend */}
      <div className="flex items-center justify-between opacity-60 px-1">
        <span className="text-[10px] uppercase tracking-wider font-bold">
          Session Timeline
        </span>
        <div className="flex gap-3">
          <span className="text-[10px] flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{' '}
            Standard
          </span>
          <span className="text-[10px] flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>{' '}
            Adaptive
          </span>
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex h-28 w-full mt-1">
        {/* --- Y-axis (Left Column) --- */}
        <div className="w-8 flex flex-col justify-between text-[9px] font-mono text-text-secondary/50 pr-3 border-r border-white/10 shrink-0 select-none">
          <span className="leading-none text-right translate-y-[50%]">
            {Math.round(maxWpm)}
          </span>
          <span className="leading-none text-right">
            {Math.round(maxWpm / 2)}
          </span>
          <span className="leading-none text-right -translate-y-[50%]">0</span>
        </div>

        {/* --- Graph Body (Right Column) --- */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Chart Area */}
          <div className="flex-1 relative border-b border-white/10">
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-0 opacity-10">
              <div className="w-full h-px border-t border-dashed border-white"></div>
              <div className="w-full h-px border-t border-dashed border-white"></div>
              <div className="w-full h-px"></div>
            </div>

            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-[1px] z-10 pt-1 px-1">
              {segments.map((seg, i) => {
                const widthPercent = (seg.duration / safeTotal) * 100
                const heightPercent = Math.max(10, (seg.wpm / maxWpm) * 100)

                const isAdaptive = seg.mode === 'adaptive'
                const baseColor = isAdaptive ? 'bg-purple-500' : 'bg-blue-500'
                const shadowColor = isAdaptive
                  ? 'shadow-purple-500/20'
                  : 'shadow-blue-500/20'

                return (
                  <div
                    key={seg.id || i}
                    style={{
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                    }}
                    className={`
                      relative group/bar
                      rounded-t-[3px]
                      ${baseColor}
                      bg-gradient-to-b from-white/30 to-transparent
                      opacity-80 hover:opacity-100
                      hover:shadow-[0_0_10px_rgba(0,0,0,0.5)] ${shadowColor}
                      transition-all duration-200
                      cursor-help
                    `}
                  >
                    {/* Tooltip */}
                    <div
                      className="
                      absolute bottom-[100%] mb-2 left-1/2 -translate-x-1/2 z-50
                      hidden group-hover/bar:block w-max pointer-events-none
                      bg-bg-secondary border border-white/10 shadow-xl rounded-lg px-3 py-2
                      animate-in fade-in slide-in-from-bottom-1 duration-150
                    "
                    >
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-bg-secondary border-r border-b border-white/10 rotate-45"></div>
                      <div className="flex flex-col gap-1 relative z-10">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 mb-0.5">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-widest ${isAdaptive ? 'text-purple-400' : 'text-blue-400'}`}
                          >
                            {isAdaptive ? 'Adaptive' : 'Standard'}
                          </span>
                          <span className="text-[9px] font-mono text-text-secondary">
                            {formatDuration(seg.duration)}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <Zap className="w-3 h-3 text-primary" />
                          <span className="text-sm font-bold text-text tabular-nums">
                            {Math.round(seg.wpm)}
                          </span>
                          <span className="text-[9px] text-text-secondary">
                            wpm
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-[9px] text-text-secondary/40 font-mono select-none pt-1.5 px-1">
            <span className="leading-none">0m</span>
            <span className="leading-none">
              {formatDuration(safeTotal / 2)}
            </span>
            <span className="leading-none">{formatDuration(safeTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}
