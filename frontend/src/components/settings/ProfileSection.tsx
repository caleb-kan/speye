import type { User } from '@supabase/supabase-js'
import { DefaultAvatar } from '../DefaultAvatar'

export type ProfileSectionProps = {
  user: User
  avatarUrl: string | null
}

export function ProfileSection({ user, avatarUrl }: ProfileSectionProps) {
  return (
    <section className="mb-5">
      <h2 className="text-sm text-text-secondary mb-2 text-center">profile</h2>
      <div className="bg-bg-secondary rounded-lg p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-text-secondary/30">
            <DefaultAvatar email={user.email} avatarUrl={avatarUrl} size="lg" />
          </div>
          <p className="text-sm text-text-secondary">{user.email}</p>
        </div>
      </div>
    </section>
  )
}
