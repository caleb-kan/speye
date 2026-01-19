import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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
      navigate('/home')
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
            timeoutRef.current = setTimeout(() => navigate('/home'), 2000)
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
          timeoutRef.current = setTimeout(() => navigate('/home'), 1000)
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
              type="email"
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
              type="password"
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
            <div className="mb-8 p-4 text-sm text-error bg-error/10 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-8 p-4 text-sm text-success bg-success/10 rounded-lg">
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
