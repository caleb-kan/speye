import { Calendar, ShieldCheck, Layers, Info } from 'lucide-react'
import { VERIFIED_SCORE_THRESHOLD } from '../../constants/admin'

export type Timeframe = '7D' | '30D' | 'ALL'

const TIMEFRAMES: Timeframe[] = ['7D', '30D', 'ALL']

interface Props {
  timeframe: Timeframe
  setTimeframe: (t: Timeframe) => void
  isVerifiedMode: boolean
  setIsVerifiedMode: (v: boolean) => void
}

export function ActivityHeader({
  timeframe,
  setTimeframe,
  isVerifiedMode,
  setIsVerifiedMode,
}: Props) {
  return (
    <div className="relative z-50 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 shrink-0">
      <div className="mt-1">
        <h1 className="text-2xl font-bold text-text mb-1 tracking-tight">
          Activity
        </h1>
        <p className="text-text-secondary text-xs">
          Track your speed reading progress and comprehension.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 sm:gap-4">
        <div className="flex items-center bg-bg-secondary/40 backdrop-blur-xl p-1.5 rounded-2xl border border-text-secondary/10 shadow-sm ring-1 ring-white/5">
          <button
            onClick={() => setIsVerifiedMode(false)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
              !isVerifiedMode
                ? 'bg-primary/20 text-primary shadow-sm'
                : 'text-text-secondary hover:text-text hover:bg-text-secondary/10'
            }`}
          >
            <Layers size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">All Activity</span>
            <span className="sm:hidden">All</span>
          </button>

          <div className="relative group/verify ml-1">
            <button
              onClick={() => setIsVerifiedMode(true)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                isVerifiedMode
                  ? 'bg-[#10b981]/20 text-[#10b981] shadow-sm'
                  : 'text-text-secondary hover:text-text hover:bg-text-secondary/10'
              }`}
            >
              <ShieldCheck size={14} strokeWidth={2.5} />
              <span>Verified</span>

              <Info
                size={12}
                strokeWidth={3}
                className="opacity-40 group-hover/verify:opacity-100 transition-opacity ml-0.5"
              />
            </button>

            <div className="absolute top-[calc(100%+10px)] right-0 w-[220px] p-3.5 bg-bg-secondary/95 backdrop-blur-xl border border-text-secondary/15 rounded-xl shadow-2xl opacity-0 invisible group-hover/verify:opacity-100 group-hover/verify:visible transition-all duration-300 z-50 pointer-events-none translate-y-1 group-hover/verify:translate-y-0">
              <div className="absolute -top-1.5 right-8 w-3 h-3 bg-bg-secondary/95 border-l border-t border-text-secondary/15 rotate-45" />

              <div className="relative z-10">
                <p className="text-text font-bold text-xs mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-[#10b981]" />
                  Verified Speed
                </p>
                <p className="text-text-secondary text-[10px] leading-relaxed">
                  Only includes reading sessions where you scored{' '}
                  <strong className="text-text">
                    {VERIFIED_SCORE_THRESHOLD}% or higher
                  </strong>{' '}
                  on the comprehension quiz.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-bg-secondary/40 backdrop-blur-xl p-1.5 rounded-2xl border border-text-secondary/10 shadow-sm ring-1 ring-white/5">
          <div className="hidden sm:flex items-center justify-center px-3 mr-1 border-r border-text-secondary/15 h-5">
            <Calendar className="w-4 h-4 text-text-secondary/60" />
          </div>

          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 sm:px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                timeframe === tf
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text hover:bg-text-secondary/10'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
