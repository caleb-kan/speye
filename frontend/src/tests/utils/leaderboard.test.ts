import { describe, it, expect } from 'vitest'
import { mergeLocalEntry } from '../../utils/leaderboard'
import type { LeaderboardEntry } from '../../services/leaderboardService'

function makeEntry(
  overrides: Partial<LeaderboardEntry> & { userId: string }
): LeaderboardEntry {
  return {
    username: null,
    avatarUrl: null,
    wpm: 100,
    quizScore: 80,
    overallScore: 8000,
    rank: 1,
    ...overrides,
  }
}

describe('mergeLocalEntry', () => {
  it('inserts local entry into empty leaderboard', () => {
    const local = makeEntry({
      userId: 'u1',
      overallScore: 5000,
    })
    const result = mergeLocalEntry([], local, 5)

    expect(result.top).toHaveLength(1)
    expect(result.top[0].userId).toBe('u1')
    expect(result.top[0].rank).toBe(1)
    expect(result.currentUser).toBeNull()
  })

  it('replaces existing entry for the same user', () => {
    const existing = [
      makeEntry({ userId: 'u1', overallScore: 3000, rank: 2 }),
      makeEntry({ userId: 'u2', overallScore: 5000, rank: 1 }),
    ]
    const local = makeEntry({ userId: 'u1', overallScore: 9000 })
    const result = mergeLocalEntry(existing, local, 5)

    expect(result.top).toHaveLength(2)
    expect(result.top[0].userId).toBe('u1')
    expect(result.top[0].overallScore).toBe(9000)
    expect(result.top[0].rank).toBe(1)
    expect(result.top[1].rank).toBe(2)
  })

  it('assigns correct ranks after merge', () => {
    const existing = [
      makeEntry({ userId: 'u1', overallScore: 5000, rank: 1 }),
      makeEntry({ userId: 'u2', overallScore: 3000, rank: 2 }),
    ]
    const local = makeEntry({ userId: 'u3', overallScore: 4000 })
    const result = mergeLocalEntry(existing, local, 5)

    expect(result.top.map((e) => e.userId)).toEqual(['u1', 'u3', 'u2'])
    expect(result.top.map((e) => e.rank)).toEqual([1, 2, 3])
  })

  it('puts user in currentUser when outside top N', () => {
    const existing = [
      makeEntry({ userId: 'u1', overallScore: 9000, rank: 1 }),
      makeEntry({ userId: 'u2', overallScore: 8000, rank: 2 }),
    ]
    const local = makeEntry({ userId: 'u3', overallScore: 1000 })
    const result = mergeLocalEntry(existing, local, 2)

    expect(result.top).toHaveLength(2)
    expect(result.currentUser).not.toBeNull()
    expect(result.currentUser!.userId).toBe('u3')
    expect(result.currentUser!.rank).toBe(3)
  })

  it('does not mutate original entries', () => {
    const entry = makeEntry({ userId: 'u1', overallScore: 5000, rank: 1 })
    const original = { ...entry }
    const local = makeEntry({ userId: 'u2', overallScore: 9000 })

    mergeLocalEntry([entry], local, 5)

    expect(entry.rank).toBe(original.rank)
  })

  it('returns null currentUser when user is in top N', () => {
    const existing = [makeEntry({ userId: 'u1', overallScore: 5000, rank: 1 })]
    const local = makeEntry({ userId: 'u2', overallScore: 9000 })
    const result = mergeLocalEntry(existing, local, 5)

    expect(result.currentUser).toBeNull()
  })
})
