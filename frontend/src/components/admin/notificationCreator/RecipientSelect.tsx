import { Users, Radio } from 'lucide-react'
import { BROADCAST_VALUE } from '../../../constants/admin'
import type { UsernameRecord } from '../../../services/userService'

interface RecipientSelectProps {
  users: UsernameRecord[]
  recipient: string
  isBroadcast: boolean
  sending: boolean
  onRecipientChange: (val: string) => void
  onBroadcastChange: (val: boolean) => void
}

export function RecipientSelect({
  users,
  recipient,
  isBroadcast,
  sending,
  onRecipientChange,
  onBroadcastChange,
}: RecipientSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold text-text-secondary flex items-center gap-1.5">
        <Users size={12} /> Recipient
      </label>
      <div className="relative">
        <select
          value={isBroadcast ? BROADCAST_VALUE : recipient}
          onChange={(e) => {
            const val = e.target.value
            if (val === BROADCAST_VALUE) {
              onBroadcastChange(true)
              onRecipientChange('')
            } else {
              onBroadcastChange(false)
              onRecipientChange(val)
            }
          }}
          disabled={sending}
          className="w-full appearance-none bg-bg border border-text-secondary/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/50 transition-colors text-text"
        >
          <option value="">Select User...</option>
          <option value={BROADCAST_VALUE} className="font-bold">
            Broadcast to All Users
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username || `User ${user.id.slice(0, 8)}...`}
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
      {isBroadcast && (
        <p className="text-[10px] text-primary flex items-center gap-1 animate-pulse">
          <Radio size={10} />
          Sending to {users.length} users
        </p>
      )}
    </div>
  )
}
