import { supabase } from '../../../lib/supabase'
import type { AuthResponse, OAuthResponse } from '@supabase/supabase-js'

export type EmailPasswordCredentials = {
  email: string
  password: string
}

export const signInWithGoogle = async (
  redirectTo: string
): Promise<OAuthResponse> => {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })
}

export const signUpWithEmail = async (
  credentials: EmailPasswordCredentials
): Promise<AuthResponse> => {
  return supabase.auth.signUp(credentials)
}

export const signInWithEmail = async (
  credentials: EmailPasswordCredentials
): Promise<AuthResponse> => {
  return supabase.auth.signInWithPassword(credentials)
}
