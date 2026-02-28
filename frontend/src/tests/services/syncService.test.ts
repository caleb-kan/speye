import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQueueStore } = vi.hoisted(() => ({
  mockQueueStore: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    iterate: vi.fn(),
    length: vi.fn(),
  },
}))

vi.mock('localforage', () => ({
  default: {
    createInstance: () => mockQueueStore,
  },
}))

// Mock all database functions
vi.mock(
  '../../../../backend/supabase/database/userActivity/logUserActivity',
  () => ({
    logUserActivity: vi.fn(),
  })
)
vi.mock(
  '../../../../backend/supabase/database/userActivity/saveQuizResult',
  () => ({
    saveQuizResult: vi.fn(),
  })
)
vi.mock(
  '../../../../backend/supabase/database/notifications/markNotificationSeen',
  () => ({
    markNotificationSeen: vi.fn(),
  })
)
vi.mock(
  '../../../../backend/supabase/database/notifications/markAllNotificationsSeen',
  () => ({
    markAllNotificationsSeen: vi.fn(),
  })
)
vi.mock('../../services/leaderboardService', () => ({
  updateLeaderboardCache: vi.fn(),
}))
vi.mock('../../services/offlineCache', () => ({
  setLastSyncTime: vi.fn(),
}))
vi.mock('../../utils/pwaLogger', () => ({
  pwaLogger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import { processQueue, recoverUnloadQueue } from '../../services/syncService'
import { logUserActivity } from '../../../../backend/supabase/database/userActivity/logUserActivity'
import { saveQuizResult } from '../../../../backend/supabase/database/userActivity/saveQuizResult'
import { markNotificationSeen } from '../../../../backend/supabase/database/notifications/markNotificationSeen'
import { markAllNotificationsSeen } from '../../../../backend/supabase/database/notifications/markAllNotificationsSeen'
import type { QueuedOperation } from '../../services/operationQueue'

const mockStorage: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value
  },
  removeItem: (key: string) => {
    delete mockStorage[key]
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  },
}

describe('syncService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', mockLocalStorage)
    mockLocalStorage.clear()
  })

  describe('processQueue', () => {
    it('should dispatch each queued operation type to the correct handler', async () => {
      const ops: QueuedOperation[] = [
        {
          id: 'op-1',
          type: 'logUserActivity',
          payload: {
            textId: 'text-1',
            wpm: 250,
            startTime: '2024-01-01T00:00:00Z',
            mode: 'standard' as const,
            progressIndex: 10,
          },
          timestamp: 1000,
          retryCount: 0,
        },
        {
          id: 'op-2',
          type: 'saveQuizResult',
          payload: { text_id: 'text-1', score: 85 },
          timestamp: 2000,
          retryCount: 0,
        },
        {
          id: 'op-3',
          type: 'markNotificationSeen',
          payload: { id: 'notif-1' },
          timestamp: 3000,
          retryCount: 0,
        },
        {
          id: 'op-4',
          type: 'markAllNotificationsSeen',
          payload: { userId: 'user-1' },
          timestamp: 4000,
          retryCount: 0,
        },
      ]

      mockQueueStore.iterate.mockImplementation(
        async (callback: (value: unknown) => void) => {
          ops.forEach((op) => callback(op))
        }
      )
      vi.mocked(logUserActivity).mockResolvedValue(null)
      vi.mocked(saveQuizResult).mockResolvedValue({
        user_id: 'user-1',
        text_id: 'text-1',
        score: 85,
      } as never)
      vi.mocked(markNotificationSeen).mockResolvedValue(undefined)
      vi.mocked(markAllNotificationsSeen).mockResolvedValue(undefined)
      mockQueueStore.removeItem.mockResolvedValue(undefined)

      await processQueue()

      expect(logUserActivity).toHaveBeenCalledWith(ops[0].payload)
      expect(mockQueueStore.removeItem).toHaveBeenCalledWith('op-1')
      expect(saveQuizResult).toHaveBeenCalledWith(ops[1].payload)
      expect(markNotificationSeen).toHaveBeenCalledWith('notif-1')
      expect(markAllNotificationsSeen).toHaveBeenCalledWith('user-1')
    })

    it('should increment retry count on failure', async () => {
      const op: QueuedOperation = {
        id: 'op-1',
        type: 'logUserActivity',
        payload: {
          textId: 'text-1',
          wpm: 250,
          startTime: '2024-01-01T00:00:00Z',
          mode: 'standard' as const,
          progressIndex: 10,
        },
        timestamp: 1000,
        retryCount: 0,
      }

      mockQueueStore.iterate.mockImplementation(
        async (callback: (value: unknown) => void) => {
          callback(op)
        }
      )
      vi.mocked(logUserActivity).mockRejectedValue(new Error('Network error'))
      mockQueueStore.setItem.mockResolvedValue(undefined)

      await processQueue()

      expect(mockQueueStore.setItem).toHaveBeenCalledWith(
        'op-1',
        expect.objectContaining({ retryCount: 1 })
      )
    })

    it('should remove operations that exceed max retries', async () => {
      const op: QueuedOperation = {
        id: 'op-1',
        type: 'logUserActivity',
        payload: {
          textId: 'text-1',
          wpm: 250,
          startTime: '2024-01-01T00:00:00Z',
          mode: 'standard' as const,
          progressIndex: 10,
        },
        timestamp: 1000,
        retryCount: 5,
      }

      mockQueueStore.iterate.mockImplementation(
        async (callback: (value: unknown) => void) => {
          callback(op)
        }
      )
      mockQueueStore.removeItem.mockResolvedValue(undefined)

      await processQueue()

      expect(logUserActivity).not.toHaveBeenCalled()
      expect(mockQueueStore.removeItem).toHaveBeenCalledWith('op-1')
    })

    it('should process operations in timestamp order', async () => {
      const callOrder: string[] = []

      const op1: QueuedOperation = {
        id: 'op-1',
        type: 'logUserActivity',
        payload: {
          textId: 'text-1',
          wpm: 250,
          startTime: '2024-01-01T00:00:00Z',
          mode: 'standard' as const,
          progressIndex: 10,
        },
        timestamp: 2000,
        retryCount: 0,
      }
      const op2: QueuedOperation = {
        id: 'op-2',
        type: 'saveQuizResult',
        payload: { text_id: 'text-1', score: 85 },
        timestamp: 1000,
        retryCount: 0,
      }

      mockQueueStore.iterate.mockImplementation(
        async (callback: (value: unknown) => void) => {
          callback(op1)
          callback(op2)
        }
      )

      vi.mocked(logUserActivity).mockImplementation(async () => {
        callOrder.push('logUserActivity')
        return null
      })
      vi.mocked(saveQuizResult).mockImplementation(async () => {
        callOrder.push('saveQuizResult')
        return null as never
      })
      mockQueueStore.removeItem.mockResolvedValue(undefined)

      await processQueue()

      // op2 (timestamp: 1000) should be processed before op1 (timestamp: 2000)
      expect(callOrder).toEqual(['saveQuizResult', 'logUserActivity'])
    })
  })

  describe('recoverUnloadQueue', () => {
    it('should move localStorage entries to operation queue', async () => {
      const entries = [
        {
          id: 'unload-1',
          type: 'logUserActivity',
          payload: {
            textId: 'text-1',
            wpm: 250,
            startTime: '2024-01-01T00:00:00Z',
            mode: 'standard',
            progressIndex: 10,
          },
          timestamp: 1000,
          retryCount: 0,
        },
      ]
      localStorage.setItem('speye-unload-queue', JSON.stringify(entries))
      mockQueueStore.setItem.mockResolvedValue(undefined)

      await recoverUnloadQueue()

      expect(localStorage.getItem('speye-unload-queue')).toBeNull()
      expect(mockQueueStore.setItem).toHaveBeenCalled()
    })

    it('should handle empty localStorage gracefully', async () => {
      await recoverUnloadQueue()
      expect(mockQueueStore.setItem).not.toHaveBeenCalled()
    })

    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem('speye-unload-queue', 'invalid-json')

      await recoverUnloadQueue()

      expect(localStorage.getItem('speye-unload-queue')).toBeNull()
    })
  })
})
