import type { LucideIcon } from 'lucide-react'
import type { ElementType } from 'react'

type Props = {
  label: string
  value: string | number
  unit?: string
  icon: LucideIcon | ElementType
  delay?: number
}

export function StatWidget({
  label,
  value,
  unit,
  icon: Icon,
  delay = 0,
}: Props) {
  return (
    <div
      className="relative overflow-hidden p-5 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md shadow-xl animate-in fade-in zoom-in duration-500 fill-mode-backwards"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon className="w-16 h-16 text-primary" />
      </div>
      <div className="flex flex-col h-full justify-between relative z-10">
        <div className="flex items-center gap-2 text-text-secondary text-sm font-medium uppercase tracking-wider">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <div className="mt-2">
          <span className="text-3xl sm:text-4xl font-semibold text-text tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-sm text-text-secondary font-medium ml-1">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
