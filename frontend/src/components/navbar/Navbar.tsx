import { Link, useLocation } from 'react-router-dom'
import { NavItem } from './NavItem'
import {
  Home,
  BookOpen,
  ListChecks,
  Settings,
  User,
  Shield,
} from 'lucide-react'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useAuth } from '../../hooks/useAuth'
import { useIsMobile } from '../../hooks/useIsMobile'
import { DefaultAvatar } from '../DefaultAvatar'
import { getAvatarUrl } from '../../utils/getAvatarUrl'
import { getUsername } from '../../utils/getUsername'
import { DEFAULT_MODE } from '../../constants/modes'
import { getRuntimeBase } from '../../utils/getRuntimeBase'
import { logUserActivity } from '../../services/logUserActivity'
import {
  clearReadingActivitySession,
  loadReadingActivitySession,
} from '../../utils/readingActivityStorage'
import { useReadingPreferences } from '../../hooks/useReadingPreferences'
import { ROUTES, MODE_ROUTES } from '../../utils/routes'

export function Navbar() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const { preferences } = useReadingPreferences()
  const isMobile = useIsMobile()

  const isAdmin = useIsAdmin()

  const isLoginActive = location.pathname === ROUTES.LOGIN
  const isSettingsActive = location.pathname === ROUTES.SETTINGS
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

  // Handles navigation for auth links that don't use NavItem.
  // Logs activity, then forces a full page reload when leaving
  // adaptive mode to ensure WebGazer is properly cleaned up.
  const handleAuthLinkClick = (e: React.MouseEvent, targetPath: string) => {
    handleBeforeNavigate(targetPath)
    if (isInAdaptiveMode) {
      e.preventDefault()
      const basePath = getRuntimeBase()
      window.location.href = `${basePath}${targetPath.slice(1)}`
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
      <NavItem
        to={ROUTES.ACTIVITY}
        icon={<ListChecks size={22} />}
        label="Activity"
        onBeforeNavigate={handleBeforeNavigate}
      />
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

      {/* Admin-only navigation */}
      {user && isAdmin && (
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
        />
      ) : user ? (
        <Link
          to={ROUTES.SETTINGS}
          onClick={(e) => handleAuthLinkClick(e, ROUTES.SETTINGS)}
          aria-label="Profile settings"
          aria-current={isSettingsActive ? 'page' : undefined}
          className={`
            flex justify-center items-center
            w-8 h-8 shrink-0
            rounded-full transition-all
            overflow-hidden
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${isSettingsActive ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-text-secondary/50'}
          `}
        >
          <DefaultAvatar
            username={getUsername(user)}
            avatarUrl={getAvatarUrl(user)}
            size="sm"
          />
        </Link>
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
        >
          <User size={22} />
        </Link>
      )}
    </nav>
  )
}
