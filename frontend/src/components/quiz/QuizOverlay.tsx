import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { MODAL_Z_INDEX } from '../../constants/quiz'

type QuizOverlayProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function QuizOverlay({ isOpen, onClose, children }: QuizOverlayProps) {
  const modalRoot = document.getElementById('modal-root')

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  if (!modalRoot) {
    console.error('modal-root element not found')
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: MODAL_Z_INDEX }}
      onClick={onClose}
    >
      {/* Modal */}
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div
          className="bg-bg rounded-2xl shadow-2xl max-w-4xl w-full p-4 animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  )
}
