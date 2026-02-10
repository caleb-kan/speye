import { useEffect } from 'react'
import type { NavigateFunction } from 'react-router-dom'

export type AuthRedirectParams = {
  user: unknown | null
  authLoading: boolean
  navigate: NavigateFunction
  returnTo: string
}

export const useAuthRedirect = ({
  user,
  authLoading,
  navigate,
  returnTo,
}: AuthRedirectParams) => {
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { returnTo } })
    }
  }, [user, authLoading, navigate, returnTo])
}
