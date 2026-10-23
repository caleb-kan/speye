import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTextLeaderboard,
  updateLeaderboardCache,
} from '../../services/leaderboardService'
import { isOffline } from '../../services/networkStatus'
import { pwaLogger } from '../../utils/pwaLogger'

const {
  mockGetTextLeaderboardDb,
  mockGetTextLeaderboardFallback,
  mockUpdateLeaderboardCacheDb,
} = vi.hoisted(() => ({
  mockGetTextLeaderboardDb: vi.fn(),
  mockGetTextLeaderboardFallback: vi.fn(),
  mockUpdateLeaderboardCacheDb: vi.fn(),
}))

vi.mock('../../../../backend/redis/getTextLeaderboard', () => ({
  getTextLeaderboard: mockGetTextLeaderboardDb,
}))

vi.mock(
  '../../../../backend/supabase/database/leaderboard/getTextLeaderboard',
  () => ({
    getTextLeaderboard: mockGetTextLeaderboardFallback,
  })
)

vi.mock(
  '../../../../backend/supabase/database/leaderboard/updateLeaderboardCache',
  () => ({
    updateLeaderboardCache: mockUpdateLeaderboardCacheDb,
  })
)

vi.mock('../../utils/pwaLogger', () => ({
  pwaLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../services/networkStatus', () => ({
  isOffline: vi.fn(() => false),
}))

describe('leaderboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isOffline).mockReturnValue(false)
    mockUpdateLeaderboardCacheDb.mockReset().mockResolvedValue(undefined)
    mockGetTextLeaderboardFallback
      .mockReset()
      .mockResolvedValue({ top: [], currentUser: null })
  })

  describe('getTextLeaderboard', () => {
    const mockTop = [
      {
        userId: 'user-1',
        wpm: 300,
        quizScore: 100,
        overallScore: 30000,
        rank: 1,
      },
      {
        userId: 'user-2',
        wpm: 250,
        quizScore: 80,
        overallScore: 20000,
        rank: 2,
      },
      {
        userId: 'user-3',
        wpm: 200,
        quizScore: 60,
        overallScore: 12000,
        rank: 3,
      },
    ]

    it('should return top entries and null currentUser', async () => {
      mockGetTextLeaderboardDb.mockResolvedValue({
        top: mockTop,
        currentUser: null,
      })

      const result = await getTextLeaderboard('text-1')

      expect(mockGetTextLeaderboardDb).toHaveBeenCalledWith('text-1', undefined)
      expect(result.top).toHaveLength(3)
      expect(result.top[0].userId).toBe('user-1')
      expect(result.currentUser).toBeNull()
      expect(mockGetTextLeaderboardFallback).not.toHaveBeenCalled()
    })

    it('should pass currentUserId to the backend function', async () => {
      mockGetTextLeaderboardDb.mockResolvedValue({
        top: mockTop,
        currentUser: null,
      })

      await getTextLeaderboard('text-1', 'current-user')

      expect(mockGetTextLeaderboardDb).toHaveBeenCalledWith(
        'text-1',
        'current-user'
      )
    })

    it('should return currentUser when not in top 5', async () => {
      const currentUser = {
        userId: 'user-10',
        wpm: 100,
        quizScore: 40,
        overallScore: 4000,
        rank: 10,
      }
      mockGetTextLeaderboardDb.mockResolvedValue({ top: mockTop, currentUser })

      const result = await getTextLeaderboard('text-1', 'user-10')

      expect(result.currentUser).toEqual(currentUser)
      expect(result.currentUser?.rank).toBe(10)
    })

    it('should use saved results when the Redis cache is empty', async () => {
      mockGetTextLeaderboardDb.mockResolvedValue({ top: [], currentUser: null })
      mockGetTextLeaderboardFallback.mockResolvedValue({
        top: mockTop,
        currentUser: null,
      })

      const result = await getTextLeaderboard('text-1')

      expect(result.top).toEqual(mockTop)
      expect(result.currentUser).toBeNull()
      expect(mockGetTextLeaderboardFallback).toHaveBeenCalledWith(
        'text-1',
        undefined
      )
      expect(mockUpdateLeaderboardCacheDb).not.toHaveBeenCalled()
    })

    it('warms an empty cache without delaying saved results and deduplicates pending warms', async () => {
      mockGetTextLeaderboardDb.mockResolvedValue({ top: [], currentUser: null })
      const saved = { top: mockTop, currentUser: null }
      mockGetTextLeaderboardFallback.mockResolvedValue(saved)
      let finishWarm!: () => void
      const warming = new Promise<void>((resolve) => {
        finishWarm = resolve
      })
      mockUpdateLeaderboardCacheDb.mockReturnValue(warming)

      expect(
        await Promise.all([
          getTextLeaderboard('cold-text', 'reader'),
          getTextLeaderboard('cold-text', 'reader'),
        ])
      ).toEqual([saved, saved])
      expect(mockUpdateLeaderboardCacheDb).toHaveBeenCalledExactlyOnceWith(
        'cold-text',
        'reader'
      )
      finishWarm()
      await warming
      expect(await getTextLeaderboard('cold-text', 'reader')).toEqual(saved)
      expect(mockUpdateLeaderboardCacheDb).toHaveBeenCalledTimes(2)
    })

    it('preserves saved results when asynchronous warming fails and allows retry', async () => {
      mockGetTextLeaderboardDb.mockResolvedValue({ top: [], currentUser: null })
      const saved = { top: mockTop, currentUser: null }
      mockGetTextLeaderboardFallback.mockResolvedValue(saved)
      mockUpdateLeaderboardCacheDb.mockRejectedValue(new Error('Redis quota'))

      expect(await getTextLeaderboard('failed-warm-text', 'reader')).toEqual(
        saved
      )
      await vi.waitFor(() => expect(pwaLogger.error).toHaveBeenCalled())
      expect(await getTextLeaderboard('failed-warm-text', 'reader')).toEqual(
        saved
      )
      expect(mockUpdateLeaderboardCacheDb).toHaveBeenCalledTimes(2)
    })

    it('does not warm a leaderboard without saved entries', async () => {
      mockGetTextLeaderboardDb.mockResolvedValue({ top: [], currentUser: null })

      expect(await getTextLeaderboard('empty-text', 'reader')).toEqual({
        top: [],
        currentUser: null,
      })
      expect(mockUpdateLeaderboardCacheDb).not.toHaveBeenCalled()
    })

    it('does not read or warm leaderboards while offline', async () => {
      vi.mocked(isOffline).mockReturnValue(true)

      expect(await getTextLeaderboard('text-1', 'reader')).toEqual({
        top: [],
        currentUser: null,
      })
      expect(mockGetTextLeaderboardDb).not.toHaveBeenCalled()
      expect(mockGetTextLeaderboardFallback).not.toHaveBeenCalled()
      expect(mockUpdateLeaderboardCacheDb).not.toHaveBeenCalled()
    })

    it('should recover from a Redis DNS failure using saved results', async () => {
      mockGetTextLeaderboardDb.mockRejectedValue(
        new TypeError('Failed to fetch')
      )
      const currentUser = { userId: 'reader', rank: 8 }
      mockGetTextLeaderboardFallback.mockResolvedValue({
        top: mockTop,
        currentUser,
      })
      expect(await getTextLeaderboard('text-1', 'reader')).toEqual({
        top: mockTop,
        currentUser,
      })
      expect(mockGetTextLeaderboardFallback).toHaveBeenCalledWith(
        'text-1',
        'reader'
      )
      expect(mockUpdateLeaderboardCacheDb).not.toHaveBeenCalled()
    })

    it('should report a database error if both leaderboard sources fail', async () => {
      mockGetTextLeaderboardDb.mockRejectedValue(
        new Error('Redis request failed: 500')
      )
      mockGetTextLeaderboardFallback.mockRejectedValue(
        new Error('Database unavailable')
      )

      await expect(getTextLeaderboard('text-1')).rejects.toThrow(
        'Database unavailable'
      )
    })

    it('should throw fallback message for non-Error exceptions', async () => {
      mockGetTextLeaderboardDb.mockRejectedValue('unexpected string error')
      mockGetTextLeaderboardFallback.mockRejectedValue(
        'unexpected string error'
      )

      await expect(getTextLeaderboard('text-1')).rejects.toThrow(
        'Failed to load leaderboard'
      )
    })
  })

  describe('updateLeaderboardCache', () => {
    it('should call the backend update function with correct params', async () => {
      mockUpdateLeaderboardCacheDb.mockResolvedValue(undefined)

      await updateLeaderboardCache('text-1', 'user-1')

      expect(mockUpdateLeaderboardCacheDb).toHaveBeenCalledWith(
        'text-1',
        'user-1'
      )
    })

    it('should not throw when backend update fails', async () => {
      mockUpdateLeaderboardCacheDb.mockRejectedValue(
        new Error('Edge function error')
      )

      await expect(
        updateLeaderboardCache('text-1', 'user-1')
      ).resolves.toBeUndefined()
    })

    it('should succeed silently on success', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUpdateLeaderboardCacheDb.mockResolvedValue(undefined)

      await updateLeaderboardCache('text-1', 'user-1')

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
