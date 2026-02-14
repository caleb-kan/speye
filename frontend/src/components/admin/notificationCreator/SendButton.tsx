import { Send } from 'lucide-react'

interface SendButtonProps {
  sending: boolean
  isBroadcast: boolean
  canSend: boolean
  onSend: () => void
}

export function SendButton({
  sending,
  isBroadcast,
  canSend,
  onSend,
}: SendButtonProps) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onSend}
        disabled={!canSend}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        <Send className="w-4 h-4" />
        {sending
          ? 'Sending...'
          : isBroadcast
            ? 'Broadcast'
            : 'Send Notification'}
      </button>
    </div>
  )
}
