import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSearchPvpUser } from '../../hooks/useSearchPvpUser'
import { searchPvpUserByUsername } from '../../services/pvpService'
import type { PvpLeaderboardEntry } from '../../types/database'

vi.mock('../../services/pvpService', () => ({
  searchPvpUserByUsername: vi.fn(),
}))

const alice: PvpLeaderboardEntry = {
  user_id: 'alice-id',
  username: 'alice',
  elo_rating: 1200,
  games_played: 0,
  wins: 0,
  losses: 0,
  draws: 0,
}

const alex: PvpLeaderboardEntry = {
  ...alice,
  user_id: 'alex-id',
  username: 'alex',
}
const mockSearch = vi.mocked(searchPvpUserByUsername)

function pendingSearch() {
  let resolve!: (users: PvpLeaderboardEntry[]) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<PvpLeaderboardEntry[]>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useSearchPvpUser request ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps newer results when an older search finishes last', async () => {
    const older = pendingSearch()
    mockSearch.mockReturnValueOnce(older.promise).mockResolvedValueOnce([alex])
    const { result } = renderHook(useSearchPvpUser)

    act(() => {
      void result.current.search('a')
    })
    await act(() => result.current.search('alex'))
    await act(async () => older.resolve([alice, alex]))

    expect(result.current.results).toEqual([alex])
    expect(result.current.error).toBeNull()
  })

  it('keeps loading until the latest search finishes', async () => {
    const older = pendingSearch()
    const latest = pendingSearch()
    mockSearch
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(latest.promise)
    const { result } = renderHook(useSearchPvpUser)

    act(() => {
      void result.current.search('a')
      void result.current.search('alex')
    })
    await act(async () => older.resolve([alice]))

    expect(result.current.loading).toBe(true)
    await act(async () => latest.resolve([alex]))
    expect(result.current.loading).toBe(false)
    expect(result.current.results).toEqual([alex])
  })

  it('ignores an older failure after a newer successful search', async () => {
    const older = pendingSearch()
    mockSearch.mockReturnValueOnce(older.promise).mockResolvedValueOnce([alex])
    const { result } = renderHook(useSearchPvpUser)

    act(() => {
      void result.current.search('a')
    })
    await act(() => result.current.search('alex'))
    await act(async () => older.reject(new Error('Old request failed')))

    expect(result.current.results).toEqual([alex])
    expect(result.current.error).toBeNull()
  })

  it.each(['success', 'failure'] as const)(
    'keeps the selection reset after a pending %s',
    async (outcome) => {
      const pending = pendingSearch()
      mockSearch.mockReturnValueOnce(pending.promise)
      const { result } = renderHook(useSearchPvpUser)

      act(() => {
        void result.current.search('alice')
        result.current.reset()
      })
      expect(result.current.loading).toBe(false)
      await act(async () => {
        if (outcome === 'success') pending.resolve([alice])
        else pending.reject(new Error('Old request failed'))
      })

      expect(result.current.results).toEqual([])
      expect(result.current.error).toBeNull()
      expect(result.current.loading).toBe(false)
    }
  )
})
