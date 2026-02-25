import type { ReactNode } from 'react'
import { MODAL_BACKDROP_BLUR, MODAL_BACKDROP_OPACITY } from '../../constants/ui'

type ModalBackdropProps = {
  children: ReactNode
  isBlurred: boolean
  onClose?: () => void
}

export function ModalBackdrop({
  children,
  isBlurred,
  onClose,
}: ModalBackdropProps) {
  return (
    <>
      <div
        className="flex flex-1 w-full min-h-0"
        style={{
          filter: isBlurred ? `blur(${MODAL_BACKDROP_BLUR}px)` : undefined,
          pointerEvents: isBlurred ? 'none' : 'auto',
        }}
        aria-hidden={isBlurred}
      >
        {children}
      </div>

      {isBlurred && onClose && (
        <div
          className="fixed inset-0 z-40"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${MODAL_BACKDROP_OPACITY / 100})`,
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  )
}
