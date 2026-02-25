import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { getAvatarUrl } from '../utils/getAvatarUrl'
import { ProfileSection } from '../components/settings/ProfileSection'
import { ThemeSection } from '../components/settings/ThemeSection'
import { ShortcutsSection } from '../components/settings/ShortcutsSection'
import { AboutSection } from '../components/settings/AboutSection'
import { AccountSection } from '../components/settings/AccountSection'
import { LoginPromptSection } from '../components/settings/LoginPromptSection'
import { useIsMobile } from '../hooks/useIsMobile'
import { useDefaultReadingRoute } from '../hooks/useDefaultReadingRoute'

export function Settings() {
  const { theme, setTheme, themes } = useTheme()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const isMobile = useIsMobile()
  const defaultRoute = useDefaultReadingRoute()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate(defaultRoute)
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 sm:px-8 p-6">
      <div className="w-full max-w-xl">
        {user && (
          <ProfileSection user={user} avatarUrl={getAvatarUrl(user) ?? null} />
        )}

        <ThemeSection theme={theme} themes={themes} onThemeChange={setTheme} />
        {!isMobile && <ShortcutsSection />}
        <AboutSection />

        {user ? (
          <AccountSection onSignOut={handleSignOut} />
        ) : (
          <LoginPromptSection onLogin={() => navigate('/login')} />
        )}

        <div className="mt-6 pb-2 text-center text-xs text-text-secondary">
          <p>© 2026 sp(eye). All rights reserved</p>
          <div className="mt-1">
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
            {' · '}
            <Link
              to="/license"
              className="text-xs text-text-secondary hover:underline"
            >
              License
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
