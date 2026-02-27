import { AlertTriangle } from 'lucide-react'
import { useEscapeKey } from '../hooks/useEscapeKey'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmDialogProps) {
  useEscapeKey(onCancel, isOpen)

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      data-testid="confirm-dialog"
    >
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start gap-4">
          {isDestructive && (
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full bg-error/10 flex items-center justify-center"
              data-testid="confirm-dialog-error-icon"
            >
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
          )}
          <div className="flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold text-text"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-message"
              className="mt-2 text-sm text-text-secondary"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-text-secondary hover:text-text hover:bg-bg rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary"
            data-testid="confirm-dialog-cancel-button"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-secondary ${
              isDestructive
                ? 'bg-error text-bg hover:bg-error/90 focus:ring-error'
                : 'bg-primary text-bg hover:opacity-90 focus:ring-primary'
            }`}
            data-testid="confirm-dialog-confirm-button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
