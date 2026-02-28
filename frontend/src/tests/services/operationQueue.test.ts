import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockStore } = vi.hoisted(() => ({
  mockStore: {
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
    createInstance: () => mockStore,
  },
}))

import {
  enqueueOperation,
  getQueuedOperations,
  removeOperation,
  updateOperation,
  clearQueue,
  getQueueLength,
  onQueueChange,
} from '../../services/operationQueue'
import type { QueuedOperation } from '../../services/operationQueue'

describe('operationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueueOperation', () => {
    it('should store operation with unique id and timestamp', async () => {
      mockStore.setItem.mockResolvedValue(undefined)

      await enqueueOperation('logUserActivity', {
        textId: 'text-1',
        wpm: 250,
        startTime: '2024-01-01T00:00:00Z',
        mode: 'standard' as const,
        progressIndex: 10,
      })

      expect(mockStore.setItem).toHaveBeenCalledWith(
        expect.stringContaining('logUserActivity-'),
        expect.objectContaining({
          type: 'logUserActivity',
          payload: expect.objectContaining({ textId: 'text-1' }),
          retryCount: 0,
          timestamp: expect.any(Number),
        })
      )
    })
  })

  describe('getQueuedOperations', () => {
    it('should return operations sorted by timestamp', async () => {
      const op1 = {
        id: 'op-1',
        type: 'logUserActivity',
        payload: {},
        timestamp: 1000,
        retryCount: 0,
      }
      const op2 = {
        id: 'op-2',
        type: 'saveQuizResult',
        payload: {},
        timestamp: 2000,
        retryCount: 0,
      }
      const op3 = {
        id: 'op-3',
        type: 'logUserActivity',
        payload: {},
        timestamp: 500,
        retryCount: 0,
      }

      mockStore.iterate.mockImplementation(
        async (callback: (value: unknown) => void) => {
          callback(op1)
          callback(op2)
          callback(op3)
        }
      )

      const ops = await getQueuedOperations()
      expect(ops).toHaveLength(3)
      expect(ops[0].id).toBe('op-3') // earliest timestamp first
      expect(ops[1].id).toBe('op-1')
      expect(ops[2].id).toBe('op-2')
    })

    it('should return empty array when queue is empty', async () => {
      mockStore.iterate.mockImplementation(async () => {})

      const ops = await getQueuedOperations()
      expect(ops).toEqual([])
    })
  })

  describe('removeOperation', () => {
    it('should remove operation by id', async () => {
      mockStore.removeItem.mockResolvedValue(undefined)

      await removeOperation('op-1')
      expect(mockStore.removeItem).toHaveBeenCalledWith('op-1')
    })
  })

  describe('clearQueue', () => {
    it('should clear all operations', async () => {
      mockStore.clear.mockResolvedValue(undefined)

      await clearQueue()
      expect(mockStore.clear).toHaveBeenCalled()
    })
  })

  describe('getQueueLength', () => {
    it('should return queue length', async () => {
      mockStore.length.mockResolvedValue(3)

      const length = await getQueueLength()
      expect(length).toBe(3)
    })
  })

  describe('onQueueChange', () => {
    it('should call listener after enqueueOperation', async () => {
      mockStore.setItem.mockResolvedValue(undefined)
      const listener = vi.fn()
      onQueueChange(listener)

      await enqueueOperation('logUserActivity', {
        textId: 'text-1',
        wpm: 250,
        startTime: '2024-01-01T00:00:00Z',
        mode: 'standard' as const,
        progressIndex: 10,
      })

      expect(listener).toHaveBeenCalledOnce()
    })

    it('should call listener after removeOperation', async () => {
      mockStore.removeItem.mockResolvedValue(undefined)
      const listener = vi.fn()
      onQueueChange(listener)

      await removeOperation('op-1')

      expect(listener).toHaveBeenCalledOnce()
    })

    it('should call listener after updateOperation', async () => {
      mockStore.setItem.mockResolvedValue(undefined)
      const listener = vi.fn()
      onQueueChange(listener)

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
        retryCount: 1,
      }
      await updateOperation(op)

      expect(listener).toHaveBeenCalledOnce()
    })

    it('should call listener after clearQueue', async () => {
      mockStore.clear.mockResolvedValue(undefined)
      const listener = vi.fn()
      onQueueChange(listener)

      await clearQueue()

      expect(listener).toHaveBeenCalledOnce()
    })

    it('should stop calling listener after unsubscribe', async () => {
      mockStore.removeItem.mockResolvedValue(undefined)
      const listener = vi.fn()
      const unsubscribe = onQueueChange(listener)

      unsubscribe()
      await removeOperation('op-1')

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
