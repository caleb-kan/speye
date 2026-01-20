import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { REDIRECT_DELAY_LOGIN, REDIRECT_DELAY_SIGNUP } from '../constants/auth'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Track timeout for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true })
    }
  }, [user, navigate])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}home`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : ((err as { message?: string })?.message ?? 'An error occurred')
      setError(message)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up new user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          setMessage(
            'Sign up successful! Please check your email to verify your account.'
          )
          // If email confirmation is disabled, redirect to home
          if (data.session) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
            timeoutRef.current = setTimeout(
              () => navigate('/home', { replace: true }),
              REDIRECT_DELAY_SIGNUP
            )
          }
        }
      } else {
        // Sign in existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          setMessage('Login successful!')
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          timeoutRef.current = setTimeout(
            () => navigate('/home', { replace: true }),
            REDIRECT_DELAY_LOGIN
          )
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : ((err as { message?: string })?.message ?? 'An error occurred')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-8">
      <div className="w-full max-w-lg p-16 bg-bg-secondary rounded-2xl shadow-lg">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-text mb-4">
            {isSignUp ? 'Sign Up' : 'Login'}
          </h1>
          <p className="text-base text-text-secondary">
            {isSignUp ? 'Create a new account' : 'Welcome back!'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="mb-10">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-secondary mb-3"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-4 border border-text-secondary/30 rounded-xl bg-bg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          {/* Password Field */}
          <div className="mb-12">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-secondary mb-3"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-5 py-4 border border-text-secondary/30 rounded-xl bg-bg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
            {isSignUp && (
              <p className="mt-3 text-xs text-text-secondary">
                Password must be at least 6 characters
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-8 p-4 text-sm text-error bg-error/10 rounded-lg"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mb-8 p-4 text-sm text-success bg-success/10 rounded-lg"
            >
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 py-4 text-bg font-semibold bg-primary rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-10">
          <div className="flex-1 h-px bg-text-secondary/30" />
          <span className="px-4 text-sm text-text-secondary">or</span>
          <div className="flex-1 h-px bg-text-secondary/30" />
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          aria-label="Sign in with Google"
          className="w-full px-5 py-4 flex items-center justify-center gap-3 border border-text-secondary/30 rounded-xl bg-bg text-text font-medium hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Toggle Sign Up / Login */}
        <div className="text-center mt-12">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setMessage(null)
            }}
            className="text-sm text-primary hover:underline transition-colors"
          >
            {isSignUp
              ? 'Already have an account? Login'
              : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Continue without login */}
        <div className="text-center mt-10 pt-10 border-t border-text-secondary/20">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="text-sm text-text-secondary hover:text-text hover:underline transition-colors"
          >
            Continue without logging in
          </button>
        </div>
      </div>
    </div>
  )
}
