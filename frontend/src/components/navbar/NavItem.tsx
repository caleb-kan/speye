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

  return (
    <Link
      to={to}
      state={state}
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
