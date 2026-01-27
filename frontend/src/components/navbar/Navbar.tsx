import { Link, useLocation } from 'react-router-dom'
import { NavItem } from './NavItem'
import { Home, BookOpen, ListChecks, Settings, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { DefaultAvatar } from '../DefaultAvatar'
import { getAvatarUrl } from '../../utils/getAvatarUrl'

export function Navbar() {
  const location = useLocation()
  const { user, loading } = useAuth()

  const isLoginActive = location.pathname === '/login'
  const isSettingsActive = location.pathname === '/settings'

  return (
    <nav
      className="
        fixed left-3 top-1/2 -translate-y-1/2 z-50
        flex flex-col items-center gap-3
        px-2.5 py-4
        bg-bg-secondary/80 backdrop-blur-md
        rounded-2xl
        shadow-md
      "
      aria-label="Main navigation"
    >
      <NavItem to="/home" icon={<Home size={22} />} label="Home" state={null} />
      <NavItem to="/library" icon={<BookOpen size={22} />} label="Library" />
      <NavItem to="/quiz" icon={<ListChecks size={22} />} label="Quiz" />
      <NavItem to="/settings" icon={<Settings size={22} />} label="Settings" />

      {/* Horizontal Separator */}
      <div className="w-6 h-px bg-text-secondary/30" />

      {/* Auth Section */}
      {loading ? (
        <div
          className="w-8 h-8 rounded-full bg-text-secondary/20 animate-pulse"
          aria-label="Loading authentication status"
        />
      ) : user ? (
        <Link
          to="/settings"
          aria-label="Profile settings"
          aria-current={isSettingsActive ? 'page' : undefined}
          className={`
            flex justify-center items-center
            w-8 h-8
            rounded-full transition-all
            overflow-hidden
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${isSettingsActive ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-text-secondary/50'}
          `}
        >
          <DefaultAvatar
            email={user.email}
            avatarUrl={getAvatarUrl(user)}
            size="sm"
          />
        </Link>
      ) : (
        <Link
          to="/login"
          aria-label="Log in"
          aria-current={isLoginActive ? 'page' : undefined}
          className={`
            flex justify-center items-center
            w-8 h-8
            rounded-full transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${isLoginActive ? 'text-primary' : 'text-text-secondary hover:text-text'}
          `}
        >
          <User size={22} />
        </Link>
      )}
    </nav>
  )
}
