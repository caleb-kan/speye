import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useState } from 'react'
import { resetPassword } from '../services/authService'
import { getErrorMessage } from '../utils/getErrorMessage'

export type UseForgotPasswordFormResult = {
  email: string
  error: string | null
  message: string | null
  loading: boolean
  handleEmailChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export const useForgotPasswordForm = (): UseForgotPasswordFormResult => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setEmail(event.target.value)
    },
    []
  )

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      setError(null)
      setMessage(null)
      setLoading(true)

      try {
        const { error } = await resetPassword(email)

        if (error) throw error

        setMessage(
          'Password reset email sent! Please check your inbox and follow the instructions.'
        )
      } catch (err: unknown) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [email]
  )

  return {
    email,
    error,
    message,
    loading,
    handleEmailChange,
    handleSubmit,
  }
}
