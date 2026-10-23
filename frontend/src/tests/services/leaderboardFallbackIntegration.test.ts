import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTextLeaderboard } from '../../services/leaderboardService'

const { databaseRead, updateCache } = vi.hoisted(() => ({
  databaseRead: vi.fn(),
  updateCache: vi.fn(),
}))
vi.mock(
  '../../../../backend/supabase/database/leaderboard/getTextLeaderboard',
  () => ({ getTextLeaderboard: databaseRead })
)
vi.mock(
  '../../../../backend/supabase/database/leaderboard/updateLeaderboardCache',
  () => ({ updateLeaderboardCache: updateCache })
)
vi.mock('../../utils/pwaLogger', () => ({
  pwaLogger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../../services/networkStatus', () => ({ isOffline: () => false }))

beforeEach(() => {
  vi.useFakeTimers()
  databaseRead.mockReset().mockResolvedValue({ top: [], currentUser: null })
  updateCache.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('real Redis reader with database fallback', () => {
  it('aborts a stalled Redis request and loads saved results within three seconds', async () => {
    let requestSignal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            requestSignal = options.signal ?? undefined
            requestSignal?.addEventListener('abort', () =>
              reject(new DOMException('Timed out', 'AbortError'))
            )
          })
      )
    )
    const pending = getTextLeaderboard('text-1', 'reader-1')
    await vi.advanceTimersByTimeAsync(3000)
    expect(requestSignal?.aborted).toBe(true)
    expect(databaseRead).toHaveBeenCalledWith('text-1', 'reader-1')
    expect(await pending).toEqual({ top: [], currentUser: null })
  })

  it('retains fast Redis reads and clears their timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ result: ['reader-1', 663] }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              result: [
                'username',
                'Reader',
                'wpm',
                '400',
                'quizScore',
                '100',
                'overallScore',
                '663',
              ],
            },
          ],
        })
    )
    const result = await getTextLeaderboard('text-1', 'reader-1')
    expect(result.top[0]).toMatchObject({
      userId: 'reader-1',
      overallScore: 663,
      rank: 1,
    })
    expect(databaseRead).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('loads saved results when a cache update changes metrics after ranks are read', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ result: ['reader-1', 500] }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              result: ['wpm', '400', 'quizScore', '100', 'overallScore', '663'],
            },
          ],
        })
    )
    const saved = {
      top: [{ userId: 'reader-1', overallScore: 663, wpm: 400 }],
      currentUser: null,
    }
    databaseRead.mockResolvedValue(saved)

    expect(await getTextLeaderboard('text-1', 'reader-1')).toEqual(saved)
    expect(databaseRead).toHaveBeenCalledWith('text-1', 'reader-1')
    expect(updateCache).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
