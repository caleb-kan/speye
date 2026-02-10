import { useAuth } from './useAuth'
import { ROLE_ADMIN } from '../constants/roles'

/**
 * Hook to check if the current user has admin role
 * @returns true if user has admin role, false otherwise
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth()
  return user?.user_metadata?.role === ROLE_ADMIN
}
