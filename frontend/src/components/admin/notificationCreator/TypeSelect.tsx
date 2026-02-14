import type { NotificationType } from '../../../types/database.ts'
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_INPUT_CLASS,
  NOTIFICATION_LABEL_CLASS,
} from '../../../constants/admin.ts'

interface TypeSelectProps {
  value: NotificationType
  disabled: boolean
  onChange: (type: NotificationType) => void
}

export function TypeSelect({ value, disabled, onChange }: TypeSelectProps) {
  return (
    <div>
      <label htmlFor="notif-type" className={NOTIFICATION_LABEL_CLASS}>
        Notification Type
      </label>
      <select
        id="notif-type"
        value={value}
        onChange={(e) => onChange(e.target.value as NotificationType)}
        className={NOTIFICATION_INPUT_CLASS}
        disabled={disabled}
      >
        {NOTIFICATION_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  )
}
