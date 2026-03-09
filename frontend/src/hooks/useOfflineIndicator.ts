import { useReducer, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNetworkStatus } from './useNetworkStatus'
import { getQueuedOperations } from '../services/operationQueue'
import { getCachedText } from '../services/offlineCache'
import type { QueuedOperation } from '../services/operationQueue'
import {
  SYNCED_BANNER_DISPLAY_MS,
  SYNCING_FALLBACK_TIMEOUT_MS,
} from '../constants/ui'

export interface QueueSummaryItem {
  id: string
  type: QueuedOperation['type']
  textTitle: string | null
}

export const TYPE_LABELS: Record<QueuedOperation['type'], string> = {
  logUserActivity: 'Activity log',
  saveQuizResult: 'Quiz result',
  markNotificationSeen: 'Notification',
  markAllNotificationsSeen: 'Notifications',
  markNotificationToastShown: 'Notification',
}

// 'syncing'        — sync started after being offline; resolves to 'synced'
// 'syncing-online' — sync started while always online; resolves to 'online' (no banner)
export type IndicatorState =
  | 'online'
  | 'offline'
  | 'syncing'
  | 'syncing-online'
  | 'synced'

type IndicatorAction =
  | { type: 'WENT_OFFLINE' }
  | { type: 'WENT_ONLINE' }
  | { type: 'SYNC_STARTED' }
  | { type: 'SYNC_FINISHED' }
  | { type: 'SYNCED_TIMEOUT' }

function indicatorReducer(
  state: IndicatorState,
  action: IndicatorAction
): IndicatorState {
  switch (action.type) {
    case 'WENT_OFFLINE':
      return 'offline'
    case 'WENT_ONLINE':
      // Coming back from offline: immediately show "All synced" (unless still syncing)
      if (state === 'offline') return 'synced'
      return state // keep syncing / syncing-online / synced / online
    case 'SYNC_STARTED':
      // Track whether sync was triggered after an offline period or always-online.
      // 'syncing-online' will not show the "All synced" banner when it finishes.
      return state === 'online' ? 'syncing-online' : 'syncing'
    case 'SYNC_FINISHED':
      if (state === 'syncing') return 'synced'
      if (state === 'syncing-online') return 'online'
      return state // 'offline' / 'synced' / 'online' — no change
    case 'SYNCED_TIMEOUT':
      return 'online'
    default:
      return state
  }
}

export function useOfflineIndicator() {
  const navigate = useNavigate()
  const { isOnline, pendingOperations, isSyncing } = useNetworkStatus()

  const [indicatorState, dispatch] = useReducer(indicatorReducer, 'online')
  const [hovered, setHovered] = useState(false)
  const [queueItems, setQueueItems] = useState<QueueSummaryItem[]>([])

  // Drive the state machine from network/sync status changes
  useEffect(() => {
    if (!isOnline) {
      dispatch({ type: 'WENT_OFFLINE' })
    } else {
      dispatch({ type: 'WENT_ONLINE' })
    }
  }, [isOnline])

  useEffect(() => {
    if (isSyncing) {
      dispatch({ type: 'SYNC_STARTED' })
    } else {
      dispatch({ type: 'SYNC_FINISHED' })
    }
  }, [isSyncing])

  useEffect(() => {
    if (indicatorState === 'synced') {
      const timer = setTimeout(
        () => dispatch({ type: 'SYNCED_TIMEOUT' }),
        SYNCED_BANNER_DISPLAY_MS
      )
      return () => clearTimeout(timer)
    }
    if (indicatorState === 'syncing' || indicatorState === 'syncing-online') {
      const fallbackTimer = setTimeout(
        () => dispatch({ type: 'SYNCED_TIMEOUT' }),
        SYNCING_FALLBACK_TIMEOUT_MS
      )
      return () => clearTimeout(fallbackTimer)
    }
  }, [indicatorState])

  useEffect(() => {
    if (!hovered || indicatorState === 'synced') return

    let cancelled = false
    async function load() {
      const ops = await getQueuedOperations()

      // Deduplicate getCachedText calls by textId
      const textIdMap = new Map<string, string | null>()
      const textIdToFetch = new Set<string>()

      for (const op of ops) {
        const textId =
          'textId' in op.payload
            ? (op.payload as { textId: string }).textId
            : 'text_id' in op.payload
              ? (op.payload as { text_id: string }).text_id
              : null
        if (textId && !textIdToFetch.has(textId)) {
          textIdToFetch.add(textId)
        }
      }

      await Promise.all(
        Array.from(textIdToFetch).map(async (id) => {
          const cached = await getCachedText(id)
          textIdMap.set(id, cached?.title ?? null)
        })
      )

      const items: QueueSummaryItem[] = ops.map((op) => {
        const textId =
          'textId' in op.payload
            ? (op.payload as { textId: string }).textId
            : 'text_id' in op.payload
              ? (op.payload as { text_id: string }).text_id
              : null
        return {
          id: op.id,
          type: op.type,
          textTitle: textId ? (textIdMap.get(textId) ?? null) : null,
        }
      })

      if (!cancelled) setQueueItems(items)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [hovered, indicatorState])

  const handleClick = () => navigate('/settings#offline-cache')

  return {
    indicatorState,
    hovered,
    setHovered,
    queueItems,
    pendingOperations,
    handleClick,
  }
}
