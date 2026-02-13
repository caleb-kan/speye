import { useState, useEffect } from 'react'
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from '../constants/ui'

export function useWindowSizeWarning() {
  const checkWindowSize = () =>
    window.innerWidth < MIN_WINDOW_WIDTH ||
    window.innerHeight < MIN_WINDOW_HEIGHT

  const [isWarningOpen, setIsWarningOpen] = useState(checkWindowSize())

  useEffect(() => {
    const handleWindowChange = () => {
      setIsWarningOpen(checkWindowSize())
    }

    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('orientationchange', handleWindowChange)

    return () => {
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('orientationchange', handleWindowChange)
    }
  }, [])

  return isWarningOpen
}
