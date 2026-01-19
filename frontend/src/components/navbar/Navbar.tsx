import { Link, useLocation } from 'react-router-dom'
import { NavItem } from './NavItem'
import { Home, BookOpen, Settings, LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { DefaultAvatar } from '../DefaultAvatar'

export function Navbar() {
  const location = useLocation()
  const { user } = useAuth()

  const isLoginActive = location.pathname === '/login'
  const isSettingsActive = location.pathname === '/settings'

  return (
    <nav
      className="
        fixed left-4 top-1/2 -translate-y-1/2
        flex flex-col items-center gap-6
        px-4 py-6
        bg-bg-secondary/80 backdrop-blur-md
        rounded-3xl
        shadow-md
      "
      aria-label="Main navigation"
    >
      <NavItem to="/home" icon={<Home size={28} />} label="Home" />
      <NavItem to="/library" icon={<BookOpen size={28} />} label="Library" />
      <NavItem to="/settings" icon={<Settings size={28} />} label="Settings" />

      {/* Horizontal Separator */}
      <div className="w-8 h-px bg-text-secondary/30" />

      {/* Auth Section */}
      {user ? (
        <Link
          to="/settings"
          aria-label="Profile settings"
          aria-current={isSettingsActive ? 'page' : undefined}
          className={`
            flex justify-center items-center
            w-10 h-10
            rounded-full transition-all
            overflow-hidden
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${isSettingsActive ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-text-secondary/50'}
          `}
        >
          <DefaultAvatar email={user.email} size="md" />
        </Link>
      ) : (
        <Link
          to="/login"
          aria-label="Log in"
          aria-current={isLoginActive ? 'page' : undefined}
          className={`
            flex justify-center items-center
            w-10 h-10
            rounded-full transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${isLoginActive ? 'text-primary' : 'text-text-secondary hover:text-text'}
          `}
        >
          <LogIn size={28} />
        </Link>
      )}
    </nav>
  )
}
