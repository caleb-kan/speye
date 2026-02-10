import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { REDIRECT_DELAY_LOGIN, REDIRECT_DELAY_SIGNUP } from '../constants/auth'
import { buildRedirectUrl } from '../utils/authRedirect'
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/authService'
import { getErrorMessage } from '../utils/getErrorMessage'

export type UseLoginFormResult = {
  email: string
  password: string
  error: string | null
  message: string | null
  loading: boolean
  isSignUp: boolean
  setEmail: (value: string) => void
  setPassword: (value: string) => void
  handleEmailChange: (event: ChangeEvent<HTMLInputElement>) => void
  handlePasswordChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleGoogleSignIn: () => Promise<void>
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  toggleMode: () => void
}

export const useLoginForm = (): UseLoginFormResult => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true })
    }
  }, [user, navigate])

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

  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setEmail(event.target.value)
    },
    []
  )

  const handlePasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setPassword(event.target.value)
    },
    []
  )

  const handleGoogleSignIn = useCallback(async (): Promise<void> => {
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const { error } = await signInWithGoogle(buildRedirectUrl())

      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      setError(null)
      setMessage(null)
      setLoading(true)

      try {
        if (isSignUp) {
          const { data, error } = await signUpWithEmail({ email, password })

          if (error) throw error

          if (data.user) {
            setMessage(
              'Sign up successful! Please check your email to verify your account.'
            )
            if (data.session) {
              clearTimeoutRef()
              timeoutRef.current = setTimeout(
                () => navigate('/home', { replace: true }),
                REDIRECT_DELAY_SIGNUP
              )
            }
          }
        } else {
          const { data, error } = await signInWithEmail({ email, password })

          if (error) throw error

          if (data.user) {
            setMessage('Login successful!')
            clearTimeoutRef()
            timeoutRef.current = setTimeout(
              () => navigate('/home', { replace: true }),
              REDIRECT_DELAY_LOGIN
            )
          }
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [clearTimeoutRef, email, isSignUp, navigate, password, setMessage, setError]
  )

  const toggleMode = useCallback((): void => {
    setIsSignUp((prev) => !prev)
    setError(null)
    setMessage(null)
  }, [])

  return {
    email,
    password,
    error,
    message,
    loading,
    isSignUp,
    setEmail,
    setPassword,
    handleEmailChange,
    handlePasswordChange,
    handleGoogleSignIn,
    handleSubmit,
    toggleMode,
  }
}
