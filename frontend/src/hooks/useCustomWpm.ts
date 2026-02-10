import type { ChangeEvent, KeyboardEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { MAX_WPM, MIN_WPM, WPM_PRESETS } from '../constants/wpm'

export type UseCustomWpmParams = {
  wpm: number
  onWpmChange: (wpm: number) => void
}

export type UseCustomWpmResult = {
  customWpm: string
  showCustomInput: boolean
  isWpmInvalid: boolean
  isCustomActive: boolean
  openCustomInput: () => void
  resetCustomInput: () => void
  handleCustomWpmChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleCustomWpmSubmit: () => void
  handleCustomWpmKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

const isValueInvalid = (value: string): boolean => {
  if (!value.trim()) return false
  const num = parseInt(value, 10)
  return isNaN(num) || num < MIN_WPM || num > MAX_WPM
}

export const useCustomWpm = (
  params: UseCustomWpmParams
): UseCustomWpmResult => {
  const { wpm, onWpmChange } = params
  const [customWpm, setCustomWpm] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isWpmInvalid, setIsWpmInvalid] = useState(false)

  const isCustomActive = useMemo(() => {
    return showCustomInput || !WPM_PRESETS.includes(wpm)
  }, [showCustomInput, wpm])

  const resetCustomInput = useCallback((): void => {
    setShowCustomInput(false)
    setCustomWpm('')
    setIsWpmInvalid(false)
  }, [])

  const openCustomInput = useCallback((): void => {
    if (!showCustomInput) {
      setShowCustomInput(true)
    }
  }, [showCustomInput])

  const handleCustomWpmChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value.replace(/[^0-9]/g, '')
      setCustomWpm(value)
      setIsWpmInvalid(isValueInvalid(value))
    },
    []
  )

  const handleCustomWpmSubmit = useCallback((): void => {
    if (!customWpm.trim()) {
      resetCustomInput()
      return
    }

    const value = parseInt(customWpm, 10)
    if (!isNaN(value)) {
      const clampedValue = Math.min(Math.max(value, MIN_WPM), MAX_WPM)
      onWpmChange(clampedValue)
    }
    resetCustomInput()
  }, [customWpm, onWpmChange, resetCustomInput])

  const handleCustomWpmKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter') {
        handleCustomWpmSubmit()
      } else if (event.key === 'Escape') {
        resetCustomInput()
      }
    },
    [handleCustomWpmSubmit, resetCustomInput]
  )

  return {
    customWpm,
    showCustomInput,
    isWpmInvalid,
    isCustomActive,
    openCustomInput,
    resetCustomInput,
    handleCustomWpmChange,
    handleCustomWpmSubmit,
    handleCustomWpmKeyDown,
  }
}
