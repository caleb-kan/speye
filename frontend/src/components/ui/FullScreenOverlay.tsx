import type { ReactNode } from 'react'

type FullScreenOverlayProps = {
  children: ReactNode
  /** Additional classes to apply to the overlay */
  className?: string
}

/**
 * Full-screen centered overlay for modals, calibration screens, etc.
 * Provides consistent positioning, background, and z-index.
 */
export function FullScreenOverlay({
  children,
  className = '',
}: FullScreenOverlayProps) {
  return (
    <div
      className={`fixed inset-0 bg-bg flex flex-col items-center justify-center z-50 p-8 ${className}`}
    >
      {children}
    </div>
  )
}
