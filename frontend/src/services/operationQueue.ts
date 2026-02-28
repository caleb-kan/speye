import localforage from 'localforage'
import type { UserActivityLogParams } from './logUserActivity'
import type { QuizResultParams } from './saveQuizResult'
import { pwaLogger } from '../utils/pwaLogger'

const TAG = 'operationQueue'

const queueStore = localforage.createInstance({
  name: 'speye-offline',
  storeName: 'operation-queue',
})

export type OperationType =
  | 'logUserActivity'
  | 'saveQuizResult'
  | 'markNotificationSeen'
  | 'markAllNotificationsSeen'
  | 'markNotificationToastShown'

export interface QueuedOperation {
  id: string
  type: OperationType
  payload:
    | UserActivityLogParams
    | QuizResultParams
    | { id: string }
    | { userId: string }
  timestamp: number
  retryCount: number
}

export async function enqueueOperation(
  type: OperationType,
  payload: QueuedOperation['payload']
): Promise<void> {
  const op: QueuedOperation = {
    id: `${type}-${Date.now()}-${crypto.randomUUID()}`,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  }
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
