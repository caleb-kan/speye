import { describe, it, expect, vi, beforeEach } from 'vitest'

// Each call to localforage.createInstance() returns a fresh mock store so that
// reads/writes to the wrong store are detectable (T5 fix).
const { mockStores } = vi.hoisted(() => {
  const stores: {
    getItem: ReturnType<typeof vi.fn>
    setItem: ReturnType<typeof vi.fn>
    removeItem: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
    iterate: ReturnType<typeof vi.fn>
    length: ReturnType<typeof vi.fn>
  }[] = []
  return { mockStores: stores }
})

vi.mock('localforage', () => ({
  default: {
    createInstance: () => {
      const store = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        iterate: vi.fn(),
        length: vi.fn(),
      }
      mockStores.push(store)
      return store
    },
  },
}))

vi.mock('../../utils/pwaLogger', () => ({
  pwaLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  getCachedText,
  setCachedText,
  getAllCachedTexts,
  getCachedLibraryTexts,
  setCachedLibraryTexts,
  getCachedActivity,
  getCachedBestScores,
  getCachedLastPosition,
  setCachedLastPosition,
  getCacheStats,
  clearAllCaches,
} from '../../services/offlineCache'
import type { Text } from '../../types/database'

const mockText: Text = {
  id: 'text-1',
  title: 'Test Text',
  content: 'Some content here',
  summary: 'A summary',
  uploaded_at: '2024-01-01T00:00:00Z',
  owner_id: 'user-1',
  quiz: null,
  fiction: true,
  complexity: 5,
  source: null,
  processing_status: 'completed',
  quiz_valid: null,
  llm_decision: null,
  llm_violation_type: null,
  admin_decision: null,
  admin_reviewed_by: null,
  admin_reviewed_at: null,
  rejection_reason: null,
  rejection_stage: null,
}

// offlineCache.ts creates stores in this order on module load:
//   textsStore (0), libraryStore (1), activityStore (2), metadataStore (3), notificationsStore (4)
function getTextsStore() {
  return mockStores[0]
}
function getLibraryStore() {
  return mockStores[1]
}
function getActivityStore() {
  return mockStores[2]
}
function getMetadataStore() {
  return mockStores[3]
}

describe('offlineCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCachedText', () => {
    it('should return cached text when valid', async () => {
      getTextsStore().getItem.mockResolvedValue({
        data: mockText,
        timestamp: Date.now(),
      })

      const result = await getCachedText('text-1')
      expect(result).toEqual(mockText)
    })

    it('should return null when cache is expired', async () => {
      getTextsStore().getItem.mockResolvedValue({
        data: mockText,
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days old
      })

      const result = await getCachedText('text-1')
      expect(result).toBeNull()
      expect(getTextsStore().removeItem).toHaveBeenCalled()
    })

    it('should return null when not cached', async () => {
      getTextsStore().getItem.mockResolvedValue(null)

      const result = await getCachedText('text-1')
      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      getTextsStore().getItem.mockRejectedValue(new Error('Storage error'))

      const result = await getCachedText('text-1')
      expect(result).toBeNull()
    })
  })

  describe('setCachedText', () => {
    it('should store text with timestamp', async () => {
      getTextsStore().setItem.mockResolvedValue(undefined)

      await setCachedText(mockText)

      expect(getTextsStore().setItem).toHaveBeenCalledWith(
        'text-1',
        expect.objectContaining({
          data: mockText,
          timestamp: expect.any(Number),
        })
      )
    })
  })

  describe('getAllCachedTexts', () => {
    it('should return all valid cached texts', async () => {
      getTextsStore().iterate.mockImplementation(
        async (callback: (entry: unknown, key: string) => void) => {
          callback({ data: mockText, timestamp: Date.now() }, 'text-1')
          callback(
            { data: { ...mockText, id: 'text-2' }, timestamp: Date.now() },
            'text-2'
          )
        }
      )

      const result = await getAllCachedTexts()
      expect(result).toHaveLength(2)
    })

    it('should filter out expired entries and delete them', async () => {
      getTextsStore().iterate.mockImplementation(
        async (callback: (entry: unknown, key: string) => void) => {
          callback({ data: mockText, timestamp: Date.now() }, 'text-1')
          callback(
            {
              data: { ...mockText, id: 'text-2' },
              timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
            },
            'text-2'
          )
        }
      )
      getTextsStore().removeItem.mockResolvedValue(undefined)

      const result = await getAllCachedTexts()
      expect(result).toHaveLength(1)
      // Expired entry should be pruned from the store
      expect(getTextsStore().removeItem).toHaveBeenCalledWith('text-2')
    })

    it('should return empty array on error', async () => {
      getTextsStore().iterate.mockRejectedValue(new Error('Storage error'))

      const result = await getAllCachedTexts()
      expect(result).toEqual([])
    })
  })

  describe('getCachedLibraryTexts / setCachedLibraryTexts', () => {
    it('should cache and retrieve library texts', async () => {
      const texts = [
        { id: 'text-1', title: 'Text 1' },
        { id: 'text-2', title: 'Text 2' },
      ]
      getLibraryStore().getItem.mockResolvedValue({
        data: texts,
        timestamp: Date.now(),
      })

      const result = await getCachedLibraryTexts('public')
      expect(result).toEqual(texts)
    })

    it('should store with correct key', async () => {
      getLibraryStore().setItem.mockResolvedValue(undefined)

      await setCachedLibraryTexts('user:123', [])
      expect(getLibraryStore().setItem).toHaveBeenCalledWith(
        'user:123',
        expect.objectContaining({ data: [] })
      )
    })
  })

  describe('getCachedActivity / setCachedActivity', () => {
    it('should cache and retrieve activity', async () => {
      const sessions = [{ id: 'session-1' }]
      getActivityStore().getItem.mockResolvedValue({
        data: sessions,
        timestamp: Date.now(),
      })

      const result = await getCachedActivity('user-1')
      expect(result).toEqual(sessions)
    })

    it('should return null for expired activity', async () => {
      getActivityStore().getItem.mockResolvedValue({
        data: [],
        timestamp: Date.now() - 31 * 60 * 1000, // 31 min old
      })

      const result = await getCachedActivity('user-1')
      expect(result).toBeNull()
    })
  })

  describe('getCachedBestScores / setCachedBestScores', () => {
    it('should cache and retrieve scores', async () => {
      const scores = { 'text-1': 85, 'text-2': 92 }
      getMetadataStore().getItem.mockResolvedValue({
        data: scores,
        timestamp: Date.now(),
      })

      const result = await getCachedBestScores('user-1')
      expect(result).toEqual(scores)
    })
  })

  describe('getCachedLastPosition / setCachedLastPosition', () => {
    it('should cache and retrieve position', async () => {
      getMetadataStore().getItem.mockResolvedValue({
        data: 42,
        timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year old — Infinity TTL
      })

      const result = await getCachedLastPosition('text-1')
      expect(result).toBe(42)
    })

    it('should store position', async () => {
      getMetadataStore().setItem.mockResolvedValue(undefined)

      await setCachedLastPosition('text-1', 42)
      expect(getMetadataStore().setItem).toHaveBeenCalledWith(
        'lastPosition:text-1',
        expect.objectContaining({ data: 42 })
      )
    })
  })

  describe('getCacheStats', () => {
    it('should return text count and size estimate', async () => {
      getTextsStore().iterate.mockImplementation(
        async (callback: (entry: unknown, key: string) => void) => {
          callback({ data: mockText, timestamp: Date.now() }, 'text-1')
        }
      )
      // For lastSyncTime
      getMetadataStore().getItem.mockResolvedValue({
        data: 1700000000000,
        timestamp: Date.now(),
      })

      const stats = await getCacheStats()
      expect(stats.textCount).toBe(1)
      expect(stats.totalSizeEstimate).toBeGreaterThan(0)
      expect(stats.lastSyncTime).toBe(1700000000000)
    })
  })

  describe('clearAllCaches', () => {
    it('should clear all stores', async () => {
      mockStores.forEach((store) => store.clear.mockResolvedValue(undefined))

      await clearAllCaches()

      // Derive expected count from actual stores created (T4 fix: not hardcoded)
      const storeCount = mockStores.length
      expect(storeCount).toBeGreaterThan(0)
      mockStores.forEach((store) => {
        expect(store.clear).toHaveBeenCalledTimes(1)
      })
    })
  })
})
