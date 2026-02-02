import { Link } from 'react-router-dom'

export function Footer() {
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
      </div>
    </footer>
  )
}
