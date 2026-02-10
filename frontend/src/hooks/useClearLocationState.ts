import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export const useClearLocationState = (path: string) => {
  const navigate = useNavigate()

  return useCallback(() => {
    navigate(path, { replace: true, state: null })
  }, [navigate, path])
}
