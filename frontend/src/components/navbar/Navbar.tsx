import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NavItem } from './NavItem'
import { NavTooltip } from './NavTooltip'
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
  loadReadingActivitySession,
  rotateReadingActivitySession,
} from '../../utils/readingActivityStorage'
import { useReadingPreferences } from '../../hooks/useReadingPreferences'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { ROUTES, MODE_ROUTES } from '../../utils/routes'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const ownerId = user?.id ?? null
  const { preferences } = useReadingPreferences()
  const isMobile = useIsMobile()

  const isAdmin = useIsAdmin()
  const { isOnline } = useNetworkStatus()

  const isLoginActive = location.pathname === ROUTES.LOGIN
  const isProfileActive = location.pathname === ROUTES.PROFILE
  const isInAdaptiveMode = location.pathname === ROUTES.ADAPTIVE
  const isInReadingRoute =
    location.pathname === ROUTES.HOME ||
    location.pathname === ROUTES.ADAPTIVE ||
    location.pathname === ROUTES.RSVP

  const handleBeforeNavigate = (targetPath: string) => {
    if (!user || !isInReadingRoute) return
    if (targetPath === location.pathname) return

    const activitySession = loadReadingActivitySession(ownerId)
    if (
      !activitySession?.started ||
      !activitySession.textId ||
      !activitySession.startTime
    )
      return

    void logUserActivity(
      {
        id: activitySession.activityId ?? undefined,
        textId: activitySession.textId,
        wpm: activitySession.wpm ?? 0,
        startTime: activitySession.startTime,
        endTime: new Date().toISOString(),
        mode: activitySession.mode ?? DEFAULT_MODE,
        progressIndex: activitySession.progressIndex ?? 0,
      },
      ownerId
    )

    rotateReadingActivitySession(ownerId)
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
        items-center
        bg-bg-secondary/80 backdrop-blur-md
        shadow-md
        ${
          isMobile
            ? `bottom-0 inset-x-0 grid ${user && isAdmin && isOnline ? 'grid-cols-7' : 'grid-cols-6'} h-(--mobile-navigation-height) pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] border-t border-text-secondary/15`
            : 'left-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 px-2.5 py-4 rounded-2xl'
        }
      `}
      aria-label="Main navigation"
      data-testid="navbar"
    >
      <NavItem
        to={isMobile ? ROUTES.RSVP : MODE_ROUTES[preferences.mode]}
        icon={<Home size={22} />}
        label="Home"
        isMobile={isMobile}
        state={null}
        onBeforeNavigate={handleBeforeNavigate}
      />
      <NavItem
        to={ROUTES.LIBRARY}
        icon={<BookOpen size={22} />}
        label="Library"
        isMobile={isMobile}
        onBeforeNavigate={handleBeforeNavigate}
      />
      <NavItem
        to={ROUTES.ACTIVITY}
        icon={<ListChecks size={22} />}
        label="Activity"
        isMobile={isMobile}
        onBeforeNavigate={handleBeforeNavigate}
        disabled={!user}
        disabledLabel="Sign in to see your activity"
      />
      <NavItem
        to={ROUTES.PVP}
        icon={<Swords size={22} />}
        label="PvP"
        isMobile={isMobile}
        onBeforeNavigate={handleBeforeNavigate}
        disabled={!user}
        disabledLabel="Sign in to play PvP"
      />
      <NavItem
        to={ROUTES.SETTINGS}
        icon={<Settings size={22} />}
        label="Settings"
        isMobile={isMobile}
        onBeforeNavigate={handleBeforeNavigate}
      />

      {!isMobile && <div className="w-6 h-px bg-text-secondary/30" />}

      {/* Admin-only navigation (hidden offline — entirely server-dependent) */}
      {user && isAdmin && isOnline && (
        <NavItem
          to={ROUTES.ADMIN}
          icon={<Shield size={22} />}
          label="Admin"
          isMobile={isMobile}
          onBeforeNavigate={handleBeforeNavigate}
        />
      )}

      {loading ? (
        <div
          className="w-8 h-8 rounded-full bg-text-secondary/20 animate-pulse"
          aria-label="Loading authentication status"
          data-testid="auth-loading-placeholder"
        />
      ) : user ? (
        <Link
          to={ROUTES.PROFILE}
          onClick={(e) => handleAuthLinkClick(e, ROUTES.PROFILE)}
          aria-label="Profile"
          aria-current={isProfileActive ? 'page' : undefined}
          className={`group relative flex justify-center items-center shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isMobile ? 'min-w-0 h-full min-h-12 flex-col gap-1 text-[10px]' : 'w-8 h-8'}`}
          data-testid="navbar-profile-avatar"
        >
          <span className="w-8 h-8 overflow-hidden rounded-full">
            <DefaultAvatar
              username={getUsername(user)}
              avatarUrl={getAvatarUrl(user)}
              size="sm"
            />
          </span>
          {isMobile ? (
            <span aria-hidden="true">Profile</span>
          ) : (
            <NavTooltip label="Profile" isMobile={false} />
          )}
        </Link>
      ) : (
        <Link
          to={ROUTES.LOGIN}
          onClick={(e) => handleAuthLinkClick(e, ROUTES.LOGIN)}
          aria-label="Log in"
          aria-current={isLoginActive ? 'page' : undefined}
          className={`
            group relative
            flex justify-center items-center
            ${isMobile ? 'min-w-0 h-full min-h-12 flex-col gap-1 text-[10px]' : 'w-8 h-8'}
            rounded-full transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${isLoginActive ? 'text-primary' : 'text-text-secondary hover:text-text'}
          `}
          data-testid="navbar-login-link"
        >
          <User size={22} />
          {isMobile ? (
            <span aria-hidden="true">Log in</span>
          ) : (
            <NavTooltip label="Log in" isMobile={false} />
          )}
        </Link>
      )}
    </nav>
  )
}
