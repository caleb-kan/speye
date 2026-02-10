import { useEffect } from 'react'

export const useAutoClearMessage = (
  value: string | null,
  setValue: (value: string | null) => void,
  delayMs: number
) => {
  useEffect(() => {
    if (!value) return

    const timer = setTimeout(() => {
      setValue(null)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [value, setValue, delayMs])
}
