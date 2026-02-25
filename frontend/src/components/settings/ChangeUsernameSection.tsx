import { useState, useCallback } from 'react'
import { Check, AlertCircle, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { isUsernameAvailable } from '../../services/userService'
import { updateUsername } from '../../services/authService'
import {
  getUsernameError,
  normaliseUsername,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from '../../utils/username'
import { getUsername } from '../../utils/getUsername'

export type ChangeUsernameSectionProps = {
  user: User
  onUsernameChange?: () => void
  onCancel?: () => void
}

export function ChangeUsernameSection({
  user,
  onUsernameChange,
  onCancel,
}: ChangeUsernameSectionProps) {
  const currentUsername = getUsername(user)
  const [newUsername, setNewUsername] = useState(currentUsername || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleUsernameChange = useCallback((value: string) => {
    const normalized = normaliseUsername(value)
    setNewUsername(normalized)

    const formatError = getUsernameError(normalized)
    setValidationError(formatError)
    setError(null)
  }, [])

  const handleCheckAvailability = useCallback(async () => {
    if (!newUsername || validationError) return

    if (newUsername === currentUsername) {
      setValidationError(null)
      return
    }

    try {
      const available = await isUsernameAvailable(newUsername)
      if (!available) {
        setValidationError('Username is already taken')
      }
    } catch {
      setError('Could not check availability. Try again.')
    }
  }, [newUsername, currentUsername, validationError])

  const handleSaveUsername = async () => {
    if (!newUsername || isLoading) return

    if (newUsername === currentUsername) return

    const formatError = getUsernameError(newUsername)
    if (formatError) {
      setValidationError(formatError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const available = await isUsernameAvailable(newUsername)
      if (!available) {
        setValidationError('Username is already taken')
        return
      }

      await updateUsername(newUsername)
      onUsernameChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username')
      console.error('Username update failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const isChanged = newUsername !== currentUsername
  const hasFormatError = Boolean(getUsernameError(newUsername))
  const canSave = isChanged && newUsername && !hasFormatError && !isLoading

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor="new-username"
          className="block text-xs text-text-secondary"
        >
          New username
        </label>
        <input
          id="new-username"
          type="text"
          value={newUsername}
          onChange={(e) => handleUsernameChange(e.target.value)}
          onBlur={handleCheckAvailability}
          placeholder="Enter new username"
          autoFocus
          className="w-full px-3 py-2 rounded-lg bg-bg text-text border border-text-secondary/20 placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 text-sm"
          disabled={isLoading}
          pattern="^[A-Za-z0-9_]+$"
          minLength={USERNAME_MIN_LENGTH}
          maxLength={USERNAME_MAX_LENGTH}
        />
      </div>

      {validationError && (
        <div className="flex items-center gap-2 text-error text-xs">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-error/10 text-error rounded-lg px-3 py-2 text-xs">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSaveUsername}
          disabled={!canSave}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-bg hover:bg-primary/90 disabled:hover:bg-primary flex items-center justify-center gap-2"
        >
          <Check size={14} aria-hidden="true" />
          {isLoading ? 'Loading...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-bg text-text-secondary hover:bg-bg-secondary disabled:hover:bg-bg flex items-center justify-center gap-2"
        >
          <X size={14} aria-hidden="true" />
          Cancel
        </button>
      </div>
    </div>
  )
}
