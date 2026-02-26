import { Loader2 } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'

export type ResetPasswordFormProps = {
  password: string
  confirmPassword: string
  error: string | null
  message: string | null
  loading: boolean
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void
  onConfirmPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export function ResetPasswordForm({
  password,
  confirmPassword,
  error,
  message,
  loading,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: ResetPasswordFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div>
        <label htmlFor="password" className="block text-sm text-text">
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={onPasswordChange}
          required
          minLength={6}
          className="w-full mt-1 py-2 px-3 text-sm border border-text-secondary/30 rounded-lg bg-bg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
        <p className="mt-1 text-xs text-text-secondary">
          Must be at least 6 characters
        </p>
      </div>

      <div className="mt-3">
        <label htmlFor="confirmPassword" className="block text-sm text-text">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={onConfirmPasswordChange}
          required
          minLength={6}
          className="w-full mt-1 py-2 px-3 text-sm border border-text-secondary/30 rounded-lg bg-bg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
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
        className="w-full mt-4 py-2.5 text-sm text-bg font-semibold bg-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  )
}
