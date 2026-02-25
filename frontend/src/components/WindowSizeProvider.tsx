import { useState, type ReactNode } from 'react'
import { useWindowSizeWarning } from '../hooks/useWindowSizeWarning'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useIsMobile } from '../hooks/useIsMobile'
import { ModalBackdrop } from './ui/ModalBackdrop'
import { WindowSizeWarningModal } from './ui/WindowSizeWarningModal'

type WindowSizeProviderProps = {
  children: ReactNode
}

export function WindowSizeProvider({ children }: WindowSizeProviderProps) {
  const isWindowTooSmall = useWindowSizeWarning()
  const [isModalDismissed, setIsModalDismissed] = useState(false)
  const isMobile = useIsMobile()

  const isModalOpen = isWindowTooSmall && !isModalDismissed && !isMobile

  const handleClose = () => {
    setIsModalDismissed(true)
  }

  useEscapeKey(handleClose, isModalOpen)

  return (
    <>
      <ModalBackdrop isBlurred={isModalOpen} onClose={handleClose}>
        {children}
      </ModalBackdrop>
      <WindowSizeWarningModal isOpen={isModalOpen} onClose={handleClose} />
    </>
  )
}
