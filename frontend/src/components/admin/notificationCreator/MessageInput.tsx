interface MessageInputProps {
  value: string
  sending: boolean
  onChange: (val: string) => void
}

export function MessageInput({ value, sending, onChange }: MessageInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold text-text-secondary">
        Message
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What's happening?"
        disabled={sending}
        className="w-full h-24 bg-bg border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-text-secondary/50"
      />
    </div>
  )
}
