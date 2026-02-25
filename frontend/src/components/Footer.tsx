import { Link, useLocation } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { ROUTES } from '../utils/routes'

export function Footer() {
  const isMobile = useIsMobile()
  const { pathname } = useLocation()

  if (isMobile || pathname === ROUTES.SETTINGS) return null

  return (
    <footer className="text-text-secondary fixed bottom-2 left-2 text-xs z-40">
      © 2026 sp(eye). All rights reserved
      <div>
        <Link
          to="/terms"
          className="text-xs text-text-secondary hover:underline"
        >
          Terms of Service
        </Link>
        {' · '}
        <Link
          to="/privacy"
          className="text-xs text-text-secondary hover:underline"
        >
          Privacy Policy
        </Link>
        {' · '}
        <Link
          to="/license"
          className="text-xs text-text-secondary hover:underline"
        >
          License
        </Link>
      </div>
    </footer>
  )
}
