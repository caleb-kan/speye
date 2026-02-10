import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { getAvatarUrl } from '../utils/getAvatarUrl'
import { ProfileSection } from '../components/settings/ProfileSection'
import { ThemeSection } from '../components/settings/ThemeSection'
import { ShortcutsSection } from '../components/settings/ShortcutsSection'
import { AboutSection } from '../components/settings/AboutSection'
import { AccountSection } from '../components/settings/AccountSection'
import { LoginPromptSection } from '../components/settings/LoginPromptSection'

export function Settings() {
  const { theme, setTheme, themes } = useTheme()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/home')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center px-8 py-6 overflow-y-auto">
      <div className="w-full max-w-xl">
        {/* Page Title */}
        <h1 className="text-xl font-semibold text-text mb-6 text-center">
          settings
        </h1>

        {user && (
          <ProfileSection user={user} avatarUrl={getAvatarUrl(user) ?? null} />
        )}

        <ThemeSection theme={theme} themes={themes} onThemeChange={setTheme} />
        <ShortcutsSection />
        <AboutSection />

        {user ? (
          <AccountSection onSignOut={handleSignOut} />
        ) : (
          <LoginPromptSection onLogin={() => navigate('/login')} />
        )}
      </div>
    </div>
  )
}
