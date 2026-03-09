import localforage from 'localforage'
import type { UserActivityLogParams } from './logUserActivity'
import type { QuizResultParams } from './saveQuizResult'
import { pwaLogger } from '../utils/pwaLogger'

const TAG = 'operationQueue'

const queueStore = localforage.createInstance({
  name: 'speye-offline',
  storeName: 'operation-queue',
})

type OperationType =
  | 'logUserActivity'
  | 'saveQuizResult'
  | 'markNotificationSeen'
  | 'markAllNotificationsSeen'
  | 'markNotificationToastShown'

interface BaseOperation {
  id: string
  timestamp: number
  retryCount: number
}

export type QueuedOperation =
  | (BaseOperation & {
      type: 'logUserActivity'
      payload: UserActivityLogParams
    })
  | (BaseOperation & { type: 'saveQuizResult'; payload: QuizResultParams })
  | (BaseOperation & { type: 'markNotificationSeen'; payload: { id: string } })
  | (BaseOperation & {
      type: 'markAllNotificationsSeen'
      payload: { userId: string }
    })
  | (BaseOperation & {
      type: 'markNotificationToastShown'
      payload: { id: string }
    })

export async function enqueueOperation<T extends OperationType>(
  type: T,
  payload: Extract<QueuedOperation, { type: T }>['payload']
): Promise<void> {
  const op = {
    id: `${type}-${Date.now()}-${crypto.randomUUID()}`,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  } as QueuedOperation
  pwaLogger.debug(TAG, `Enqueued operation: ${type}`, { id: op.id })
  await queueStore.setItem(op.id, op)
  notifyListeners()
}

export async function getQueuedOperations(): Promise<QueuedOperation[]> {
  const ops: QueuedOperation[] = []
  await queueStore.iterate<QueuedOperation, void>((value) => {
    ops.push(value)
  })
  return ops.sort((a, b) => a.timestamp - b.timestamp)
}

export async function removeOperation(id: string): Promise<void> {
  await queueStore.removeItem(id)
  notifyListeners()
}

export async function updateOperation(op: QueuedOperation): Promise<void> {
  await queueStore.setItem(op.id, op)
  notifyListeners()
}

export async function clearQueue(): Promise<void> {
  pwaLogger.info(TAG, 'Clearing operation queue')
  await queueStore.clear()
  notifyListeners()
}

export async function getQueueLength(): Promise<number> {
  return queueStore.length()
}

// Lightweight listener for queue changes
type QueueChangeListener = () => void
const listeners = new Set<QueueChangeListener>()

export function onQueueChange(listener: QueueChangeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyListeners() {
  listeners.forEach((fn) => fn())
}
