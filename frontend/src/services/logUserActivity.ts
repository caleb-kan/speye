import {
  logUserActivity as logUserActivityDb,
  logUserActivityOnUnload as logUserActivityOnUnloadDb,
  type UserActivityLogParams,
} from '../../../backend/supabase/database/userActivity/logUserActivity'
import { enqueueOperation } from './operationQueue'
import { SYNC } from '../constants/offline'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'

const TAG = 'logUserActivity'

export type { UserActivityLogParams }

export async function logUserActivity(params: UserActivityLogParams) {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — queuing activity log', {
      textId: params.textId,
    })
    await enqueueOperation('logUserActivity', params)
    return null
  }

  try {
    return await logUserActivityDb(params)
  } catch (err) {
    const message =
      err instanceof Error ? err.message.toLowerCase() : String(err)
    const isNetworkError =
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('aborted')

    if (isNetworkError) {
      pwaLogger.warn(TAG, 'Network failure — queuing activity log for retry', {
        textId: params.textId,
      })
      await enqueueOperation('logUserActivity', params)
      return null
    }

    pwaLogger.error(TAG, 'Non-retryable error logging activity', {
      error: err,
      textId: params.textId,
    })
    return null
  }
}

export function logUserActivityOnUnload(
  params: UserActivityLogParams,
  accessToken: string | null | undefined,
  userId: string | null | undefined
) {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline unload — writing to localStorage queue')
    // Synchronously write to localStorage (localforage is async, may not complete during unload)
    try {
      const raw = localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)
      const queue = raw ? JSON.parse(raw) : []
      queue.push({
        id: `logUserActivity-unload-${Date.now()}`,
        type: 'logUserActivity' as const,
        payload: params,
        timestamp: Date.now(),
        retryCount: 0,
      })
      localStorage.setItem(SYNC.UNLOAD_QUEUE_KEY, JSON.stringify(queue))
    } catch (err) {
      pwaLogger.warn(TAG, 'Failed to write unload queue to localStorage', err)
    }
    return
  }

  return logUserActivityOnUnloadDb(params, accessToken, userId)
}
