import { useCallback, useEffect, useState, useMemo } from 'react'
import { AuthContext } from './authContext'
import { supabase } from '../../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { clearAllCaches } from '../services/offlineCache'
import { clearQueue } from '../services/operationQueue'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const user = useMemo(() => session?.user ?? null, [session])

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
      })
      .catch((err) => {
        console.error('Failed to load auth session:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    try {
      await clearQueue()
    } catch (err) {
      console.error('Failed to clear operation queue during sign-out:', err)
    }
    try {
      await clearAllCaches()
    } catch (err) {
      console.error('Failed to clear caches during sign-out:', err)
    }
    await supabase.auth.signOut({ scope: 'global' })
  }, [])

  const value = useMemo(
    () => ({ user, session, loading, signOut }),
    [user, session, loading, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
