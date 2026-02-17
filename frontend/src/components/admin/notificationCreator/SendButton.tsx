import { Send } from 'lucide-react'

interface SendButtonProps {
  sending: boolean
  canSend: boolean
  onClick: () => void
}

export function SendButton({ sending, canSend, onClick }: SendButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!canSend}
      className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-primary/20"
    >
      <Send size={14} />
      {sending ? 'Dispatching...' : 'Send Notification'}
    </button>
  )
}
