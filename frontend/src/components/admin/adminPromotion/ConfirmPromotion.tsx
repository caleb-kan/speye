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
    <div className="bg-error/5 border border-error/20 rounded-lg p-3 animate-in zoom-in-95">
      <h4 className="text-xs font-bold text-error mb-1">Confirm Promotion</h4>
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
          className="flex-1 py-1.5 bg-text-secondary/10 hover:bg-text-secondary/20 text-text-secondary text-[10px] font-bold uppercase rounded border border-text-secondary/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={promoting}
          className="flex-1 py-1.5 bg-error hover:bg-error/90 text-bg text-[10px] font-bold uppercase rounded transition-colors"
        >
          {promoting ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}
