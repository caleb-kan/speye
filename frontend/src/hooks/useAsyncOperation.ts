import { useState, useCallback } from 'react'

export interface AsyncOperationState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface AsyncOperationActions<T> {
  execute: (operation: () => Promise<T>) => Promise<T | null>
  setData: (data: T | null) => void
  clearError: () => void
  reset: () => void
}

export type UseAsyncOperationReturn<T> = AsyncOperationState<T> &
  AsyncOperationActions<T>

/**
 * Hook for managing async operation state (loading, error, data).
 * Provides a unified pattern for handling async operations.
 */
export function useAsyncOperation<T>(
  initialData: T | null = null
): UseAsyncOperationReturn<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await operation()
        setData(result)
        return result
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setData(initialData)
    setLoading(false)
    setError(null)
  }, [initialData])

  return {
    data,
    loading,
    error,
    execute,
    setData,
    clearError,
    reset,
  }
}
