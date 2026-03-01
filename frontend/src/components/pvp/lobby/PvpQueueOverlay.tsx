import { useEffect, useRef, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import { formatElapsedTime } from '../../../utils/pvp'

type PvpQueueOverlayProps = {
  visible: boolean
  queueTime: number
  onCancel: () => void
}

export function PvpQueueOverlay({
  visible,
  queueTime,
  onCancel,
}: PvpQueueOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (visible) {
      prevFocusRef.current = document.activeElement as HTMLElement
      cancelRef.current?.focus()
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus()
      prevFocusRef.current = null
    }
  }, [visible])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      if (e.key !== 'Tab') return

      const overlay = overlayRef.current
      if (!overlay) return

      const focusable = overlay.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onCancel]
  )

  useEffect(() => {
    if (!visible) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, handleKeyDown])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pvp-queue-overlay-title"
      aria-describedby="pvp-queue-timer"
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-bg/80 backdrop-blur-md
        animate-in fade-in duration-300
      "
    >
      <div className="flex flex-col items-center gap-8 max-w-sm mx-auto px-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
            aria-hidden="true"
          />
          <div
            className="absolute inset-2 rounded-full bg-primary/10 animate-pulse"
            aria-hidden="true"
          />
          <Loader2
            size={32}
            className="text-primary animate-spin"
            aria-hidden="true"
          />
        </div>

        <div className="text-center">
          <p
            id="pvp-queue-overlay-title"
            className="text-lg font-medium text-text mb-1"
          >
            Searching for opponent...
          </p>
          <p
            id="pvp-queue-timer"
            className="text-3xl font-bold text-text tabular-nums"
            aria-label={`Time in queue: ${formatElapsedTime(queueTime)}`}
          >
            {formatElapsedTime(queueTime)}
          </p>
        </div>

        <button
          ref={cancelRef}
          onClick={onCancel}
          className="
            flex items-center gap-2 px-6 py-2.5 rounded-xl
            border border-text-secondary/20 text-text-secondary
            hover:bg-text-secondary/10 hover:text-text
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          "
        >
          <X size={16} />
          Cancel
        </button>
      </div>
    </div>
  )
}
