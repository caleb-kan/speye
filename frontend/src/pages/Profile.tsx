import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAvatarUrl } from '../utils/getAvatarUrl'
import { ProfileSection } from '../components/settings/ProfileSection'
import { AccountSection } from '../components/settings/AccountSection'
import { LoginPromptSection } from '../components/settings/LoginPromptSection'
import { useDefaultReadingRoute } from '../hooks/useDefaultReadingRoute'
import { ROUTES } from '../utils/routes'

export function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const defaultRoute = useDefaultReadingRoute()
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const handleSignOut = async () => {
    setSignOutError(null)
    try {
      await signOut()
      navigate(defaultRoute)
    } catch (error) {
      console.error('Sign out failed:', error)
      setSignOutError('Sign out failed. Please try again.')
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 sm:px-8 p-6">
      <div className="w-full max-w-xl">
        {user ? (
          <>
            <ProfileSection
              user={user}
              avatarUrl={getAvatarUrl(user) ?? null}
            />
            {signOutError && (
              <p className="text-error text-sm mb-4">{signOutError}</p>
            )}
            <AccountSection onSignOut={handleSignOut} />
          </>
        ) : (
          <LoginPromptSection onLogin={() => navigate(ROUTES.LOGIN)} />
        )}
      </div>
    </div>
  )
}
