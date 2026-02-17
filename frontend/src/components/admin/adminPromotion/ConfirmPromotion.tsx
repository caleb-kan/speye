interface ConfirmPromotionProps {
  selectedUsername: string | null
  promoting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmPromotion({
  selectedUsername,
  promoting,
  onConfirm,
  onCancel,
}: ConfirmPromotionProps) {
  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 animate-in zoom-in-95">
      <h4 className="text-xs font-bold text-red-400 mb-1">Confirm Promotion</h4>
      <p className="text-[10px] text-text-secondary mb-3">
        Are you sure? This will grant full system access to{' '}
        <span className="text-text font-mono">
          {selectedUsername || 'this user'}
        </span>
        .
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-text-secondary text-[10px] font-bold uppercase rounded border border-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={promoting}
          className="flex-1 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-bold uppercase rounded transition-colors"
        >
          {promoting ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}
