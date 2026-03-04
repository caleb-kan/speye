import type { LucideIcon } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'

type Props = {
  label: string
  value: string | number
  unit?: string
  icon: LucideIcon | ElementType
  subValue?: ReactNode
  className?: string
}

export function StatWidget({
  label,
  value,
  unit,
  icon: Icon,
  subValue,
  className = '',
}: Props) {
  return (
    <div
      className={`relative overflow-hidden p-4 sm:p-6 rounded-2xl bg-bg-secondary/20 border border-text-secondary/10 backdrop-blur-md transition-all duration-300 hover:bg-bg-secondary/40 hover:border-text-secondary/20 group shadow-sm flex flex-col h-full min-h-[140px] ${className}`}
    >
      <div className="absolute -top-1 -right-1 p-4 opacity-[0.03] pointer-events-none transition-transform duration-700 ease-out group-hover:scale-125 group-hover:opacity-[0.06] group-hover:-rotate-12">
        <Icon className="w-24 h-24 text-text" />
      </div>

      <div className="flex flex-col h-full justify-between relative z-10 flex-1">
        <div className="flex items-center gap-1.5 text-text-secondary text-[10px] font-bold uppercase tracking-wider">
          <Icon className="w-4 h-4 text-primary/70" />
          {label}
        </div>

        <div className="flex items-end justify-between mt-auto pt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl sm:text-5xl font-black text-text tracking-tighter tabular-nums drop-shadow-md leading-none">
              {value}
            </span>
            {unit && (
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-1">
                {unit}
              </span>
            )}
          </div>

          {subValue && (
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 flex items-center mb-1">
              {subValue}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
