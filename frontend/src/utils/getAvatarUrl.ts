import type { User } from '@supabase/supabase-js'

/**
 * Gets the user's avatar URL from Supabase user object.
 * Checks user_metadata first, then falls back to identity_data for OAuth users.
 */
export function getAvatarUrl(user: User | null): string | undefined {
  const metadata = user?.user_metadata
  const identityData = user?.identities?.[0]?.identity_data

  return (
    metadata?.avatar_url ??
    metadata?.picture ??
    identityData?.picture ??
    identityData?.avatar_url
  )
}
