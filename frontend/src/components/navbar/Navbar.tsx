import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NavItem } from './NavItem'
import {
  Home,
  BookOpen,
  ListChecks,
  Settings,
  User,
  Shield,
  Swords,
} from 'lucide-react'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useAuth } from '../../hooks/useAuth'
import { useIsMobile } from '../../hooks/useIsMobile'
import { DefaultAvatar } from '../DefaultAvatar'
import { getAvatarUrl } from '../../utils/getAvatarUrl'
import { getUsername } from '../../utils/getUsername'
import { DEFAULT_MODE } from '../../constants/modes'
import { logUserActivity } from '../../services/logUserActivity'
import {
  clearReadingActivitySession,
  loadReadingActivitySession,
} from '../../utils/readingActivityStorage'
import { useReadingPreferences } from '../../hooks/useReadingPreferences'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { ROUTES, MODE_ROUTES } from '../../utils/routes'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { preferences } = useReadingPreferences()
  const isMobile = useIsMobile()

  const isAdmin = useIsAdmin()
  const { isOnline } = useNetworkStatus()

  const isLoginActive = location.pathname === ROUTES.LOGIN
  const isInAdaptiveMode = location.pathname === ROUTES.ADAPTIVE
  const isInReadingRoute =
    location.pathname === ROUTES.HOME ||
    location.pathname === ROUTES.ADAPTIVE ||
    location.pathname === ROUTES.RSVP

  const handleBeforeNavigate = (targetPath: string) => {
    if (!user || !isInReadingRoute) return
    if (targetPath === location.pathname) return

    // In adaptive mode, skip logging here. The full page reload
    // triggers beforeunload/pagehide which logs via keepalive fetch.
    if (isInAdaptiveMode) return

    const activitySession = loadReadingActivitySession()
    if (
      !activitySession?.started ||
      !activitySession.textId ||
      !activitySession.startTime
    )
      return

    void logUserActivity({
      textId: activitySession.textId,
      wpm: activitySession.wpm ?? 0,
      startTime: activitySession.startTime,
      endTime: new Date().toISOString(),
      mode: activitySession.mode ?? DEFAULT_MODE,
      progressIndex: activitySession.progressIndex ?? 0,
    })

    clearReadingActivitySession()
  }

  // Handles navigation for the login link (which doesn't use NavItem).
  // Logs activity, then handles navigation when leaving
  // adaptive mode to ensure WebGazer is properly cleaned up.
  const handleAuthLinkClick = (e: React.MouseEvent, targetPath: string) => {
    handleBeforeNavigate(targetPath)
    if (isInAdaptiveMode) {
      e.preventDefault()
      // Use React Router navigate to stay within PWA
      navigate(targetPath, { replace: true })
    }
  }

  return (
    <nav
      className={`
        fixed z-50
        flex items-center
        bg-bg-secondary/80 backdrop-blur-md
        shadow-md
        ${
          isMobile
            ? 'top-2 left-1/2 -translate-x-1/2 flex-row gap-3 px-3 py-1.5 rounded-full'
            : 'left-3 top-1/2 -translate-y-1/2 flex-col gap-3 px-2.5 py-4 rounded-2xl'
        }
      `}
      aria-label="Main navigation"
      data-testid="navbar"
    >
      <NavItem
        to={MODE_ROUTES[preferences.mode]}
        icon={<Home size={22} />}
        label="Home"
        state={null}
        onBeforeNavigate={handleBeforeNavigate}
      />
      <NavItem
        to={ROUTES.LIBRARY}
        icon={<BookOpen size={22} />}
        label="Library"
        onBeforeNavigate={handleBeforeNavigate}
      />
      {user && (
        <NavItem
          to={ROUTES.ACTIVITY}
          icon={<ListChecks size={22} />}
          label="Activity"
          onBeforeNavigate={handleBeforeNavigate}
        />
      )}
      {user && (
        <NavItem
          to={ROUTES.PVP}
          icon={<Swords size={22} />}
          label="Ranked"
          onBeforeNavigate={handleBeforeNavigate}
        />
      )}
      <NavItem
        to={ROUTES.SETTINGS}
        icon={<Settings size={22} />}
        label="Settings"
        onBeforeNavigate={handleBeforeNavigate}
      />

      {/* Separator between nav and admin/auth */}
      <div
        className={
          isMobile
            ? 'w-px h-6 shrink-0 bg-text-secondary/30'
            : 'w-6 h-px bg-text-secondary/30'
        }
      />

      {/* Admin-only navigation (hidden offline — entirely server-dependent) */}
      {user && isAdmin && isOnline && (
        <NavItem
          to={ROUTES.ADMIN}
          icon={<Shield size={22} />}
          label="Admin"
          onBeforeNavigate={handleBeforeNavigate}
        />
      )}

      {/* Auth Section */}
      {loading ? (
        <div
          className="w-8 h-8 rounded-full bg-text-secondary/20 animate-pulse"
          aria-label="Loading authentication status"
          data-testid="auth-loading-placeholder"
        />
      ) : user ? (
        <div
          className="flex justify-center items-center w-8 h-8 shrink-0 rounded-full overflow-hidden"
          aria-hidden="true"
          data-testid="navbar-profile-avatar"
        >
          <DefaultAvatar
            username={getUsername(user)}
            avatarUrl={getAvatarUrl(user)}
            size="sm"
          />
        </div>
      ) : (
        <Link
          to={ROUTES.LOGIN}
          onClick={(e) => handleAuthLinkClick(e, ROUTES.LOGIN)}
          aria-label="Log in"
          aria-current={isLoginActive ? 'page' : undefined}
          className={`
            flex justify-center items-center
            w-8 h-8
            rounded-full transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${isLoginActive ? 'text-primary' : 'text-text-secondary hover:text-text'}
          `}
          data-testid="navbar-login-link"
        >
          <User size={22} />
        </Link>
      )}
    </nav>
  )
}
