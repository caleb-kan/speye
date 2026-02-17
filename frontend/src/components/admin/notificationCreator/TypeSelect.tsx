import { Type } from 'lucide-react'
import { NOTIFICATION_TYPES } from '../../../constants/admin'
import type { NotificationType } from '../../../types/database'

interface TypeSelectProps {
  value: NotificationType
  onChange: (type: NotificationType) => void
}

export function TypeSelect({ value, onChange }: TypeSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold text-text-secondary flex items-center gap-1.5">
        <Type size={12} /> Notification Type
      </label>
      <div className="grid grid-cols-2 gap-2">
        {NOTIFICATION_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            className={`px-2 py-1.5 rounded-md text-[10px] font-medium border transition-all ${
              value === type.value
                ? 'bg-primary/20 border-primary/30 text-primary'
                : 'bg-white/5 border-transparent text-text-secondary hover:bg-white/10'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
