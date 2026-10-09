import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  enqueueOperation: vi.fn(),
  setCachedBestScores: vi.fn(),
  saveDb: vi.fn(),
  offline: true,
}))
vi.mock('../../../../lib/supabase', () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}))
vi.mock('../../services/networkStatus', () => ({
  isOffline: () => mocks.offline,
}))
vi.mock('../../services/operationQueue', () => ({
  enqueueOperation: mocks.enqueueOperation,
}))
vi.mock('../../services/offlineCache', () => ({
  getCachedBestScores: vi.fn().mockResolvedValue({}),
  setCachedBestScores: mocks.setCachedBestScores,
}))
vi.mock('../../services/leaderboardService', () => ({
  updateLeaderboardCache: vi.fn(),
}))
vi.mock(
  '../../../../backend/supabase/database/userActivity/saveQuizResult',
  () => ({
    saveQuizResult: mocks.saveDb,
  })
)

import { saveQuizResult } from '../../services/saveQuizResult'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.offline = true
  mocks.saveDb.mockResolvedValue(null)
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: 'reader-a' } } },
  })
})

describe('offline quiz score validation', () => {
  it.each([-1, 101, Infinity, -Infinity, NaN])(
    'rejects invalid score %s before storing or queuing it',
    async (score) => {
      await expect(
        saveQuizResult({ text_id: 'text-a', score })
      ).rejects.toThrow()
      expect(mocks.enqueueOperation).not.toHaveBeenCalled()
      expect(mocks.setCachedBestScores).not.toHaveBeenCalled()
    }
  )

  it.each([0, 100])('queues the valid boundary score %s', async (score) => {
    await expect(saveQuizResult({ text_id: 'text-a', score })).resolves.toEqual(
      {
        user_id: 'reader-a',
        text_id: 'text-a',
        score,
      }
    )
    expect(mocks.enqueueOperation).toHaveBeenCalledWith(
      'saveQuizResult',
      { text_id: 'text-a', score, completed_at: expect.any(String) },
      'reader-a'
    )
  })

  it.each([true, false])(
    'persists an originating activity ID when offline is %s',
    async (offline) => {
      mocks.offline = offline
      const params = {
        activity_id: 'originating-activity',
        text_id: 'text-a',
        score: 90,
      }
      expect(await saveQuizResult(params)).toEqual({
        user_id: 'reader-a',
        text_id: 'text-a',
        score: 90,
      })
      expect(mocks.enqueueOperation).toHaveBeenCalledWith(
        'saveQuizResult',
        { ...params, completed_at: expect.any(String) },
        'reader-a'
      )
    }
  )

  it.each([
    'Failed to find latest activity: TypeError: Failed to fetch',
    'Failed to save quiz result: Network request failed',
  ])(
    'queues the original score after transient database failure: %s',
    async (message) => {
      mocks.offline = false
      mocks.saveDb.mockRejectedValue(new Error(message))
      const params = {
        text_id: 'text-a',
        score: 90,
        activity_id: 'originating-activity',
      }
      expect(await saveQuizResult(params)).toEqual({
        user_id: 'reader-a',
        text_id: 'text-a',
        score: 90,
      })
      expect(mocks.enqueueOperation).toHaveBeenCalledExactlyOnceWith(
        'saveQuizResult',
        { ...params, completed_at: expect.any(String) },
        'reader-a'
      )
    }
  )

  it('propagates permission failures without queuing them', async () => {
    mocks.offline = false
    mocks.saveDb.mockRejectedValue(
      new Error(
        'Failed to save quiz result: new row violates row-level security policy'
      )
    )
    await expect(
      saveQuizResult({
        text_id: 'text-a',
        score: 90,
        activity_id: 'originating-activity',
      })
    ).rejects.toThrow('row-level security')
    expect(mocks.enqueueOperation).not.toHaveBeenCalled()
  })
})
