import { Link, useLocation } from 'react-router-dom'
import { NavItem } from './NavItem'
import { Home, BookOpen, Settings, LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'

export function Navbar() {
  const location = useLocation()
  const { user } = useAuth()
  const { profile } = useProfile()

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
          className={`
            flex justify-center items-center
            w-10 h-10
            rounded-full transition-all
            overflow-hidden
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${isSettingsActive ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-text-secondary/50'}
          `}
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <DefaultAvatar email={user.email} />
          )}
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

function DefaultAvatar({ email }: { email?: string }) {
  // Generate a consistent color based on email
  const getColorFromEmail = (email?: string) => {
    if (!email) return 'hsl(220, 70%, 50%)'
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return `hsl(${hue}, 65%, 45%)`
  }

  const initial = email?.charAt(0).toUpperCase() || '?'
  const bgColor = getColorFromEmail(email)

  return (
    <div
      className="w-full h-full flex items-center justify-center text-white font-semibold text-sm"
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  )
}
