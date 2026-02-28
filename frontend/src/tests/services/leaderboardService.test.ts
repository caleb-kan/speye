import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTextLeaderboard,
  updateLeaderboardCache,
} from '../../services/leaderboardService'

const { mockGetTextLeaderboardDb, mockUpdateLeaderboardCacheDb } = vi.hoisted(
  () => ({
    mockGetTextLeaderboardDb: vi.fn(),
    mockUpdateLeaderboardCacheDb: vi.fn(),
  })
)

vi.mock('../../../../backend/redis/getTextLeaderboard', () => ({
  getTextLeaderboard: mockGetTextLeaderboardDb,
}))

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

describe('leaderboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    it('should return empty top when no entries exist', async () => {
      mockGetTextLeaderboardDb.mockResolvedValue({ top: [], currentUser: null })

      const result = await getTextLeaderboard('text-1')

      expect(result.top).toEqual([])
      expect(result.currentUser).toBeNull()
    })

    it('should re-throw the original error message for Error instances', async () => {
      mockGetTextLeaderboardDb.mockRejectedValue(
        new Error('Redis request failed: 500')
      )

      await expect(getTextLeaderboard('text-1')).rejects.toThrow(
        'Redis request failed: 500'
      )
    })

    it('should throw fallback message for non-Error exceptions', async () => {
      mockGetTextLeaderboardDb.mockRejectedValue('unexpected string error')

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
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUpdateLeaderboardCacheDb.mockRejectedValue(
        new Error('Edge function error')
      )

      await expect(
        updateLeaderboardCache('text-1', 'user-1')
      ).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Leaderboard cache update failed:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
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
