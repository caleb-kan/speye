import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { NavTooltip } from './NavTooltip'

type NavItemProps = {
  to: string
  icon: ReactNode
  label: string
  isMobile: boolean
  state?: unknown
  onBeforeNavigate?: (to: string) => void
}

export function NavItem({
  to,
  icon,
  label,
  isMobile,
  state,
  onBeforeNavigate,
}: NavItemProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = location.pathname === to
  const isInAdaptiveMode = location.pathname === '/adaptive'

  const handleClick = (e: React.MouseEvent) => {
    if (isActive) {
      e.preventDefault()
      return
    }

    // Log activity before navigating
    onBeforeNavigate?.(to)

    // When navigating away from adaptive mode, use React Router navigate
    // to stay within PWA context instead of window.location
    if (isInAdaptiveMode && to !== '/adaptive') {
      e.preventDefault()
      navigate(to, { replace: true })
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
        group relative
        flex justify-center items-center
        w-full h-9
        rounded-full transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
        ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text'}
      `}
    >
      {icon}
      <NavTooltip label={label} isMobile={isMobile} />
    </Link>
  )
}
