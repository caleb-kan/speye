import { Radio } from 'lucide-react'
import type { UsernameRecord } from '../../../services/userService'
import {
  BROADCAST_VALUE,
  NOTIFICATION_INPUT_CLASS,
  NOTIFICATION_LABEL_CLASS,
} from '../../../constants/admin'

interface RecipientSelectProps {
  users: UsernameRecord[]
  recipient: string
  isBroadcast: boolean
  disabled: boolean
  onRecipientChange: (userId: string) => void
  onBroadcastChange: (broadcast: boolean) => void
}

export function RecipientSelect({
  users,
  recipient,
  isBroadcast,
  disabled,
  onRecipientChange,
  onBroadcastChange,
}: RecipientSelectProps) {
  return (
    <div>
      <label htmlFor="notif-recipient" className={NOTIFICATION_LABEL_CLASS}>
        Recipient
      </label>
      <select
        id="notif-recipient"
        value={isBroadcast ? BROADCAST_VALUE : recipient}
        onChange={(e) => {
          if (e.target.value === BROADCAST_VALUE) {
            onBroadcastChange(true)
            onRecipientChange('')
          } else {
            onBroadcastChange(false)
            onRecipientChange(e.target.value)
          }
        }}
        className={NOTIFICATION_INPUT_CLASS}
        disabled={disabled}
      >
        <option value="">Select a user...</option>
        <option value={BROADCAST_VALUE}>Broadcast to All Users</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.username || `User ${user.id.slice(0, 8)}...`}
          </option>
        ))}
      </select>
      {isBroadcast && (
        <p className="mt-1 text-xs text-text-secondary ml-1 flex items-center gap-1">
          <Radio className="w-3 h-3" />
          Will send to all {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
