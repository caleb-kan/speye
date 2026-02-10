import type { ChangeEvent, FormEvent } from 'react'

export type LoginFormProps = {
  email: string
  password: string
  error: string | null
  message: string | null
  loading: boolean
  isSignUp: boolean
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export function LoginForm({
  email,
  password,
  error,
  message,
  loading,
  isSignUp,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div>
        <label htmlFor="email" className="block text-sm text-text">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={onEmailChange}
          required
          className="w-full mt-1 py-2 px-3 text-sm border border-text-secondary/30 rounded-lg bg-bg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      <div className="mt-3">
        <label htmlFor="password" className="block text-sm text-text">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          value={password}
          onChange={onPasswordChange}
          required
          minLength={6}
          className="w-full mt-1 py-2 px-3 text-sm border border-text-secondary/30 rounded-lg bg-bg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
        {isSignUp && (
          <p className="mt-1 text-xs text-text-secondary">
            Must be at least 6 characters
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 p-2 text-sm text-error bg-error/10 rounded-lg"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-3 p-2 text-sm text-success bg-success/10 rounded-lg"
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 py-2.5 text-sm text-bg font-semibold bg-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
      </button>
    </form>
  )
}
