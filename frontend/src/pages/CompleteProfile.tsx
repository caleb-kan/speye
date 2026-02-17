import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../utils/getErrorMessage'
import { getUsername } from '../utils/getUsername'
import {
  getUsernameError,
  normaliseUsername,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from '../utils/username'
import { isUsernameAvailable } from '../services/userService'
import { updateUsername } from '../services/authService'

export function CompleteProfile() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const existingUsername = getUsername(user ?? null) ?? ''

  useEffect(() => {
    if (existingUsername) {
      navigate('/home', { replace: true })
    }
  }, [existingUsername, navigate])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)

      if (!user) return

      const normalized = normaliseUsername(username)
      const validationError = getUsernameError(normalized)

      if (validationError) {
        setError(validationError)
        return
      }

      setSaving(true)
      try {
        const available = await isUsernameAvailable(normalized)
        if (!available) {
          setError('Username is already taken')
          return
        }

        await updateUsername(normalized)
        navigate('/home', { replace: true })
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setSaving(false)
      }
    },
    [navigate, user, username]
  )

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex-1 flex items-center justify-center px-8">
      <div className="w-full max-w-sm bg-bg-secondary rounded-xl shadow-lg px-6 py-6">
        <h1 className="text-xl font-bold text-text text-center">
          Complete your profile
        </h1>
        <p className="text-sm text-text-secondary text-center mt-1">
          Choose a unique username to finish signing up.
        </p>

        <form className="mt-5" onSubmit={handleSubmit}>
          <label htmlFor="username" className="block text-sm text-text">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="your_name"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setError(null)
            }}
            required
            minLength={USERNAME_MIN_LENGTH}
            maxLength={USERNAME_MAX_LENGTH}
            pattern="[A-Za-z0-9_]+"
            aria-invalid={Boolean(error)}
            className="w-full mt-1 py-2 px-3 text-sm border border-text-secondary/30 rounded-lg bg-bg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
          <p className="mt-1 text-xs text-text-secondary">
            3 to 20 characters, letters, numbers, underscores
          </p>

          {error && (
            <div
              role="alert"
              className="mt-3 p-2 text-sm text-error bg-error/10 rounded-lg"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || Boolean(existingUsername)}
            className="w-full mt-4 py-2.5 text-sm text-bg font-semibold bg-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Saving...' : 'Save username'}
          </button>
        </form>
      </div>
    </div>
  )
}
