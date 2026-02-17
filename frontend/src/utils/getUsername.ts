import type { User } from '@supabase/supabase-js'

/**
 * Extracts the username from a Supabase user's metadata.
 * Returns undefined if the user has no username set.
 */
export function getUsername(user: User | null): string | undefined {
  const raw = user?.user_metadata?.username
  return typeof raw === 'string' ? raw : undefined
}
