import { useEffect, useState, useMemo } from 'react'
import { AuthContext } from './authContext'
import { supabase } from '../../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { clearAllCaches } from '../services/offlineCache'
import { clearQueue } from '../services/operationQueue'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Derive user from session to avoid redundant state
  const user = useMemo(() => session?.user ?? null, [session])

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
      })
      .finally(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await clearQueue()
    await clearAllCaches()
    await supabase.auth.signOut({ scope: 'global' })
    // State is automatically updated via onAuthStateChange listener
  }

  const value = useMemo(
    () => ({ user, session, loading, signOut }),
    [user, session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
