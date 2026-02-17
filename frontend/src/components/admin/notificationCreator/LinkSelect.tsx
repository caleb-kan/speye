import { Link2 } from 'lucide-react'
import type { PAGE_LINKS } from '../../../constants/admin'

interface LinkSelectProps {
  value: string
  availableLinks: typeof PAGE_LINKS
  sending: boolean
  onChange: (val: string) => void
}

export function LinkSelect({
  value,
  availableLinks,
  sending,
  onChange,
}: LinkSelectProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-[10px] uppercase font-bold text-text-secondary flex items-center gap-1.5">
          <Link2 size={12} /> Link
        </label>
        <span className="text-[10px] text-text-secondary/50 lowercase">
          (optional)
        </span>
      </div>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={sending}
          className="w-full appearance-none bg-bg border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/50 transition-colors text-text"
        >
          <option value="">No link attached</option>
          {availableLinks.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  )
}
