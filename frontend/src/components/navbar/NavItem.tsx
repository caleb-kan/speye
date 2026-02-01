import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

type NavItemProps = {
  to: string
  icon: ReactNode
  label: string
  state?: unknown
}

export function NavItem({ to, icon, label, state }: NavItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to
  const isInAdaptiveMode = location.pathname === '/adaptive'

  const handleClick = (e: React.MouseEvent) => {
    // When navigating away from adaptive mode, use window.location
    // to force a full page reload. This ensures WebGazer is properly
    // cleaned up and React re-renders the new page correctly.
    if (isInAdaptiveMode && to !== '/adaptive') {
      e.preventDefault()
      // Build the full URL with base path
      const basePath = import.meta.env.BASE_URL || '/'
      const fullPath = basePath.endsWith('/')
        ? `${basePath}${to.startsWith('/') ? to.slice(1) : to}`
        : `${basePath}${to}`
      window.location.href = fullPath
    }
  }

  return (
    <Link
      to={to}
      state={state}
      onClick={handleClick}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={`
        flex justify-center items-center
        w-full h-9
        rounded-full transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
        ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text'}
      `}
    >
      {icon}
    </Link>
  )
}
