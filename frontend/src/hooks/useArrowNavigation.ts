import { useEffect } from 'react'

export type UseArrowNavigationParams = {
  enabled: boolean
  onBack: () => void
  onForward: () => void
}

export const useArrowNavigation = (params: UseArrowNavigationParams): void => {
  const { enabled, onBack, onForward } = params

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onBack()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        onForward()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onBack, onForward])
}
