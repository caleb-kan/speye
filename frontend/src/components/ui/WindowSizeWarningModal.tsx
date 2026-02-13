import { X } from 'lucide-react'
import { WINDOW_SIZE_WARNING_MESSAGE } from '../../constants/ui'

type WindowSizeWarningModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function WindowSizeWarningModal({
  isOpen,
  onClose,
}: WindowSizeWarningModalProps) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="window-size-warning-title"
      aria-describedby="window-size-warning-description"
      className="fixed text-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-bg-secondary border rounded-lg p-6 shadow-lg z-50 w-90"
    >
      <p id="window-size-warning-title" className="text-error">
        Please note:
      </p>
      <p id="window-size-warning-description">{WINDOW_SIZE_WARNING_MESSAGE}</p>
      <button
        onClick={onClose}
        aria-label="Close window size warning"
        className="close-button cursor-pointer absolute top-2 right-2 bg-transparent border-none p-0"
      >
        <X />
      </button>
    </div>
  )
}
