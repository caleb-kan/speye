import { useLayoutEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getUsername } from '../../utils/getUsername'
import { setReadingActivityOwner } from '../../utils/readingActivityStorage'

export function RequireUsername() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const userId = user?.id ?? null

  useLayoutEffect(() => {
    if (!loading) setReadingActivityOwner(userId)
  }, [loading, userId])

  if (loading) return null

  if (!user) {
    return <Outlet key="anonymous" />
  }

  if (!getUsername(user)) {
    return (
      <Navigate
        to="/complete-profile"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  // Reset readers and account pages when cross-tab auth changes the account.
  // Auth callback routes are outside this subtree and retain their URL state.
  return <Outlet key={user.id} />
}
