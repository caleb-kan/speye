import { useEffect, useRef, useState, useCallback } from 'react'
import {
  PVP_HEARTBEAT_INTERVAL_MS,
  PVP_DISCONNECT_WARNING_S,
  PVP_HEARTBEAT_STALENESS_MS,
  PVP_TICK_INTERVAL_MS,
} from '../constants/pvp'
import type { HeartbeatPayload } from './usePvpGameChannel'

type HeartbeatOptions = {
  userId: string | null
  sendHeartbeat: (payload: HeartbeatPayload) => void
  enabled: boolean
}

export function usePvpHeartbeat({
  userId,
  sendHeartbeat,
  enabled,
}: HeartbeatOptions) {
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const lastHeartbeatRef = useRef(0)

  useEffect(() => {
    if (!enabled || !userId) return

    const send = () => {
      sendHeartbeat({ userId, ts: Date.now() })
    }

    send()
    const interval = setInterval(send, PVP_HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [enabled, userId, sendHeartbeat])

  useEffect(() => {
    if (!enabled) {
      // Derived state reset: clear disconnect status when heartbeat monitoring is disabled
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpponentDisconnected(false)
      return
    }

    lastHeartbeatRef.current = Date.now()

    const check = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastHeartbeatRef.current) / 1000)
      setOpponentDisconnected(elapsed >= PVP_DISCONNECT_WARNING_S)
    }, PVP_TICK_INTERVAL_MS)

    return () => clearInterval(check)
  }, [enabled])

  const recordHeartbeat = useCallback((ts?: number) => {
    if (ts != null && Date.now() - ts > PVP_HEARTBEAT_STALENESS_MS) return
    lastHeartbeatRef.current = Date.now()
    setOpponentDisconnected(false)
  }, [])

  return { opponentDisconnected, recordHeartbeat }
}
