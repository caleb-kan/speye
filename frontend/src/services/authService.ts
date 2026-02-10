import { supabase } from '../../../lib/supabase'
import type {
  AuthResponse,
  OAuthResponse,
  UserResponse,
} from '@supabase/supabase-js'
import { buildRedirectUrl } from '../utils/authRedirect'

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

export const resetPassword = async (email: string) => {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildRedirectUrl('reset-password'),
  })
}

export const updatePassword = async (
  newPassword: string
): Promise<UserResponse> => {
  return supabase.auth.updateUser({
    password: newPassword,
  })
}
