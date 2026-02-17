import {
  NOTIFICATION_INPUT_CLASS,
  NOTIFICATION_LABEL_CLASS,
} from '../../../constants/admin.ts'

interface MessageInputProps {
  value: string
  disabled: boolean
  onChange: (message: string) => void
}

export function MessageInput({ value, disabled, onChange }: MessageInputProps) {
  return (
    <div>
      <label htmlFor="notif-message" className={NOTIFICATION_LABEL_CLASS}>
        Message
      </label>
      <textarea
        id="notif-message"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter notification message..."
        className={`${NOTIFICATION_INPUT_CLASS} h-20 resize-none`}
        disabled={disabled}
      />
    </div>
  )
}
