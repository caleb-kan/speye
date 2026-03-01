import { useEffect, useRef, useState, useCallback } from 'react'
import { useRefSync } from './useRefSync'
import {
  PVP_AFK_WARNING_S,
  PVP_AFK_FORFEIT_S,
  PVP_TICK_INTERVAL_MS,
  PVP_MAX_FORFEIT_ATTEMPTS,
} from '../constants/pvp'

type AfkOptions = {
  onForfeit: () => void | Promise<void>
  onForfeitFailed?: (message: string) => void
  enabled: boolean
}

export function usePvpAfkDetection({
  onForfeit,
  onForfeitFailed,
  enabled,
}: AfkOptions) {
  const [afkWarning, setAfkWarning] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const onForfeitRef = useRefSync(onForfeit)
  const onForfeitFailedRef = useRefSync(onForfeitFailed)

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setAfkWarning(false)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setAfkWarning(false)
      return
    }

    lastActivityRef.current = Date.now()

    let mounted = true
    let forfeitInFlight = false
    let forfeitSucceeded = false
    let forfeitAttempts = 0
    let maxAttemptsReached = false
    const interval = setInterval(() => {
      if (forfeitInFlight || forfeitSucceeded || maxAttemptsReached || !mounted)
        return
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000)
      if (elapsed >= PVP_AFK_FORFEIT_S) {
        setAfkWarning(false)
        if (forfeitAttempts >= PVP_MAX_FORFEIT_ATTEMPTS) {
          maxAttemptsReached = true
          onForfeitFailedRef.current?.(
            'Auto-forfeit failed. Please refresh or manually forfeit.'
          )
          return
        }
        forfeitInFlight = true
        forfeitAttempts++
        // onForfeit may be sync or async. Catch sync throws with
        // try/catch, and async rejections via Promise.resolve().catch().
        let result: unknown
        try {
          result = onForfeitRef.current()
        } catch (err) {
          console.error(
            `AFK auto-forfeit attempt ${forfeitAttempts} failed:`,
            err
          )
          if (mounted) forfeitInFlight = false
          return
        }
        Promise.resolve(result)
          .then(() => {
            forfeitSucceeded = true
          })
          .catch((err) => {
            console.error(
              `AFK auto-forfeit attempt ${forfeitAttempts} failed:`,
              err
            )
            if (mounted) forfeitInFlight = false
          })
      } else {
        setAfkWarning(elapsed >= PVP_AFK_WARNING_S)
      }
    }, PVP_TICK_INTERVAL_MS)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [enabled, onForfeitRef, onForfeitFailedRef])

  return { afkWarning, recordActivity }
}
