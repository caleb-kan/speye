import { useState, useEffect } from 'react'
import { isMobileDevice } from '../utils/isMobileDevice'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileDevice)

  useEffect(() => {
    const update = () => setIsMobile(isMobileDevice())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return isMobile
}
