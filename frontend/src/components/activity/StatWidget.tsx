import type { LucideIcon } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'

type Props = {
  label: string
  value: string | number
  unit?: string
  icon: LucideIcon | ElementType
  delay?: number
  subValue?: ReactNode
}

export function StatWidget({
  label,
  value,
  unit,
  icon: Icon,
  delay = 0,
  subValue,
}: Props) {
  return (
    <div
      className="relative overflow-hidden p-5 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md shadow-xl animate-in fade-in zoom-in duration-500 fill-mode-backwards group"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background Decorative Icon */}
      <div className="absolute -top-2 -right-2 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
        <Icon className="w-24 h-24 text-primary" />
      </div>

      <div className="flex flex-col h-full justify-between relative z-10">
        <div className="flex items-center gap-2 text-text-secondary text-xs sm:text-sm font-medium uppercase tracking-wider">
          <Icon className="w-4 h-4 text-primary/80" />
          {label}
        </div>

        <div className="flex items-end justify-between mt-4">
          {/* Main Value (Bottom Left) */}
          <div>
            <span className="text-3xl sm:text-4xl font-semibold text-text tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="text-sm text-text-secondary font-medium ml-1">
                {unit}
              </span>
            )}
          </div>

          {/* Sub Value (Bottom Right) */}
          {subValue && (
            <div className="mb-1 text-sm font-bold uppercase tracking-widest text-text-secondary/60 flex items-center">
              {subValue}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
