import { Link, useLocation } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { useReadingPreferences } from '../hooks/useReadingPreferences'
import { MODE_ROUTES } from '../utils/routes'

export function Header() {
  const isMobile = useIsMobile()
  const { preferences } = useReadingPreferences()
  const location = useLocation()

  if (isMobile) return null

  const target = MODE_ROUTES[preferences.mode]
  const isAlreadyOnTarget = location.pathname === target

  return (
    <div className="fixed top-4 left-4 z-50">
      <Link
        to={target}
        onClick={(e) => {
          if (isAlreadyOnTarget) e.preventDefault()
        }}
        className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded"
      >
        sp(eye)
      </Link>
    </div>
  )
}
