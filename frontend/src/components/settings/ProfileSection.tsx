import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Edit2 } from 'lucide-react'
import { DefaultAvatar } from '../DefaultAvatar'
import { ChangeUsernameSection } from './ChangeUsernameSection'
import { getUsername } from '../../utils/getUsername'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'

export type ProfileSectionProps = {
  user: User
  avatarUrl: string | null
}

export function ProfileSection({ user, avatarUrl }: ProfileSectionProps) {
  const username = getUsername(user)
  const { isOnline } = useNetworkStatus()
  const [isEditingUsername, setIsEditingUsername] = useState(false)

  const handleUsernameChange = () => {
    setIsEditingUsername(false)
  }

  return (
    <section className="mb-5">
      <h2 className="text-sm text-text-secondary mb-2 text-center">profile</h2>
      <div className="bg-bg-secondary rounded-lg p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-text-secondary/30">
            <DefaultAvatar
              username={username}
              avatarUrl={avatarUrl}
              size="lg"
            />
          </div>
          {username && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-text">@{username}</p>
              <button
                type="button"
                onClick={() => setIsEditingUsername(true)}
                disabled={!isOnline}
                className="p-1 rounded hover:bg-bg/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Edit username"
                title={isOnline ? 'Edit username' : 'Requires internet'}
              >
                <Edit2 size={14} className="text-text-secondary" />
              </button>
            </div>
          )}
          <p className="text-sm text-text-secondary">{user.email}</p>
        </div>

        {isEditingUsername && (
          <div className="mt-4 pt-4 border-t border-text-secondary/10">
            <ChangeUsernameSection
              user={user}
              onUsernameChange={handleUsernameChange}
              onCancel={() => setIsEditingUsername(false)}
            />
          </div>
        )}
      </div>
    </section>
  )
}
