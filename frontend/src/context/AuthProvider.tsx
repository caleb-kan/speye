import { useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import { supabase } from '../../../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Failed to get session:', error.message)
        }
        setSession(session)
        setUser(session?.user ?? null)
      })
      .catch((error) => {
        console.error('Failed to get session:', error)
      })
      .finally(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        console.error('Failed to sign out:', error.message)
      }
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
    // State is automatically updated via onAuthStateChange listener
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
