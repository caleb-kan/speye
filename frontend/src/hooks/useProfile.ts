import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Profile {
  id: string
  avatar_url: string | null
  updated_at: string | null
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, avatar_url, updated_at')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        // If no profile exists yet, create one
        if (fetchError.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert({ id: user.id })
            .select('id, avatar_url, updated_at')
            .single()

          if (insertError) throw insertError
          setProfile(newProfile)
        } else {
          throw fetchError
        }
      } else {
        setProfile(data)
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : ((err as { message?: string })?.message ?? 'Failed to load profile')
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateAvatar = async (avatarUrl: string | null) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null))
      return { error: null }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : ((err as { message?: string })?.message ??
            'Failed to update avatar')
      return { error: message }
    }
  }

  return {
    profile,
    loading,
    error,
    updateAvatar,
    refetch: fetchProfile,
  }
}
