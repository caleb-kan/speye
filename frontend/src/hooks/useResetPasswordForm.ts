import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '../services/authService'
import { getErrorMessage } from '../utils/getErrorMessage'
import { getDefaultReadingRoute } from '../utils/routes'
import { REDIRECT_DELAY_LOGIN } from '../constants/auth'

export type UseResetPasswordFormResult = {
  password: string
  confirmPassword: string
  error: string | null
  message: string | null
  loading: boolean
  isValidToken: boolean
  handlePasswordChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleConfirmPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export const useResetPasswordForm = (): UseResetPasswordFormResult => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Read hash synchronously during first render, before Supabase
  // clears window.location.hash after processing the recovery token
  const [isValidToken] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    return (
      hashParams.get('access_token') !== null &&
      hashParams.get('type') === 'recovery'
    )
  })

  useEffect(() => {
    if (!isValidToken) {
      navigate('/login', { replace: true })
    }
  }, [isValidToken, navigate])

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const clearTimeoutRef = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const handlePasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setPassword(event.target.value)
    },
    []
  )

  const handleConfirmPasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setConfirmPassword(event.target.value)
    },
    []
  )

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      setError(null)
      setMessage(null)

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }

      setLoading(true)

      try {
        const { error } = await updatePassword(password)

        if (error) throw error

        setMessage('Password updated successfully! Redirecting to home...')
        clearTimeoutRef()
        timeoutRef.current = setTimeout(
          () => navigate(getDefaultReadingRoute(), { replace: true }),
          REDIRECT_DELAY_LOGIN
        )
      } catch (err: unknown) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [clearTimeoutRef, confirmPassword, navigate, password]
  )

  return {
    password,
    confirmPassword,
    error,
    message,
    loading,
    isValidToken,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleSubmit,
  }
}
