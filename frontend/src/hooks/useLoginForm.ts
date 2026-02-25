import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { getDefaultReadingRoute } from '../utils/routes'
import { REDIRECT_DELAY_LOGIN, REDIRECT_DELAY_SIGNUP } from '../constants/auth'
import { buildRedirectUrl } from '../utils/authRedirect'
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/authService'
import { getErrorMessage } from '../utils/getErrorMessage'
import { getUsernameError, normaliseUsername } from '../utils/username'
import { isUsernameAvailable } from '../services/userService'

export type UseLoginFormResult = {
  email: string
  password: string
  username: string
  error: string | null
  usernameError: string | null
  message: string | null
  loading: boolean
  isSignUp: boolean
  setEmail: (value: string) => void
  setPassword: (value: string) => void
  setUsername: (value: string) => void
  handleEmailChange: (event: ChangeEvent<HTMLInputElement>) => void
  handlePasswordChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleUsernameChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleGoogleSignIn: () => Promise<void>
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  toggleMode: () => void
}

export const useLoginForm = (): UseLoginFormResult => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (user) {
      navigate(getDefaultReadingRoute(), { replace: true })
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

  const handleUsernameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setUsername(event.target.value)
      setUsernameError(null)
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
      setUsernameError(null)
      setMessage(null)
      setLoading(true)

      try {
        if (isSignUp) {
          const normalisedUsername = normaliseUsername(username)
          const usernameValidationError = getUsernameError(normalisedUsername)

          if (usernameValidationError) {
            setUsernameError(usernameValidationError)
            setLoading(false)
            return
          }

          const available = await isUsernameAvailable(normalisedUsername)

          if (!available) {
            setUsernameError('Username is already taken')
            setLoading(false)
            return
          }

          const { data, error } = await signUpWithEmail({
            email,
            password,
            username: normalisedUsername,
          })

          if (error) throw error

          if (data.user) {
            setMessage(
              'Sign up successful! Please check your email to verify your account.'
            )
            if (data.session) {
              clearTimeoutRef()
              timeoutRef.current = setTimeout(
                () => navigate(getDefaultReadingRoute(), { replace: true }),
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
              () => navigate(getDefaultReadingRoute(), { replace: true }),
              REDIRECT_DELAY_LOGIN
            )
          }
        }
      } catch (err: unknown) {
        const message = getErrorMessage(err)
        if (message.toLowerCase().includes('username')) {
          setUsernameError('Username is already taken')
        } else {
          setError(message)
        }
      } finally {
        setLoading(false)
      }
    },
    [
      clearTimeoutRef,
      email,
      isSignUp,
      navigate,
      password,
      setMessage,
      setError,
      username,
    ]
  )

  const toggleMode = useCallback((): void => {
    setIsSignUp((prev) => !prev)
    setError(null)
    setUsernameError(null)
    setMessage(null)
  }, [])

  return {
    email,
    password,
    username,
    error,
    usernameError,
    message,
    loading,
    isSignUp,
    setEmail,
    setPassword,
    setUsername,
    handleEmailChange,
    handlePasswordChange,
    handleUsernameChange,
    handleGoogleSignIn,
    handleSubmit,
    toggleMode,
  }
}
