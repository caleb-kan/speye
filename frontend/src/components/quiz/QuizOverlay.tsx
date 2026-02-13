import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { MODAL_Z_INDEX } from '../../constants/quiz'
import { useEscapeKey } from '../../hooks/useEscapeKey'

type QuizOverlayProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function QuizOverlay({ isOpen, onClose, children }: QuizOverlayProps) {
  const modalRoot = document.getElementById('modal-root')

  // Controls if the component is actually in the DOM
  const [isMounted, setIsMounted] = useState(false)

  // Controls the visual opacity/scale styles
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsMounted(true)

        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      requestAnimationFrame(() => {
        setIsVisible(false)
      })

      // Wait for the exit animation (500ms) to finish before removing from DOM
      const timer = setTimeout(() => setIsMounted(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Escape key
  useEscapeKey(onClose, isOpen)

  // Don't render anything until we are mounted
  if (!isMounted || !modalRoot) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: MODAL_Z_INDEX }}
    >
      <div
        className={`
          absolute inset-0 bg-black/40
          transition-opacity duration-500 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />

      <div
        className={`
          relative w-full max-w-5xl rounded-3xl bg-bg shadow-2xl p-8
          transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
          
          ${
            isVisible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-8'
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    modalRoot
  )
}
