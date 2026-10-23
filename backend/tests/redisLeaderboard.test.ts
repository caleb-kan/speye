import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTextLeaderboard } from '../redis/getTextLeaderboard'

vi.mock('../supabase/database/logger', () => ({ logDbQuery: vi.fn() }))

const request = vi.fn()
const topResponse = [{ result: ['user-1', '663'] }]
const statsResponse = [
  {
    result: [
      'username',
      'Reader',
      'avatarUrl',
      '',
      'wpm',
      '400',
      'quizScore',
      '100',
      'overallScore',
      '663',
    ],
  },
]

beforeEach(() => {
  request.mockReset()
  vi.stubGlobal('fetch', request)
})
afterEach(() => vi.unstubAllGlobals())

describe('Redis leaderboard response boundaries', () => {
  it('returns ranked entries from successful pipeline results', async () => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json(statsResponse))
    expect(await getTextLeaderboard('text-1', 'user-1')).toEqual({
      top: [
        {
          userId: 'user-1',
          username: 'Reader',
          avatarUrl: null,
          wpm: 400,
          quizScore: 100,
          overallScore: 663,
          rank: 1,
        },
      ],
      currentUser: null,
    })
  })

  it('propagates a command error instead of reporting an empty cache', async () => {
    request.mockResolvedValueOnce(Response.json([{ error: 'WRONGTYPE' }]))
    await expect(getTextLeaderboard('text-1')).rejects.toThrow('WRONGTYPE')
  })

  it('propagates a stats command error instead of returning fabricated zero stats', async () => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json([{ error: 'WRONGTYPE' }]))
    await expect(getTextLeaderboard('text-1')).rejects.toThrow('WRONGTYPE')
  })

  it('rejects an expired top entry hash so the caller can load saved results', async () => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json([{ result: [] }]))
    await expect(getTextLeaderboard('text-1')).rejects.toThrow(
      'Invalid cached leaderboard stats'
    )
  })

  it('rejects an expired current-user hash so the caller can load saved results', async () => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json(statsResponse))
      .mockResolvedValueOnce(Response.json([{ result: 5 }, { result: 420 }]))
      .mockResolvedValueOnce(Response.json([{ result: [] }]))
    await expect(getTextLeaderboard('text-1', 'user-2')).rejects.toThrow(
      'Invalid cached leaderboard stats'
    )
  })

  it.each([
    ['missing score', ['wpm', '400', 'overallScore', '663']],
    [
      'invalid WPM',
      ['wpm', 'invalid', 'quizScore', '100', 'overallScore', '663'],
    ],
    [
      'non-finite score',
      ['wpm', '400', 'quizScore', 'Infinity', 'overallScore', '663'],
    ],
    [
      'out-of-range score',
      ['wpm', '400', 'quizScore', '101', 'overallScore', '663'],
    ],
    ['missing overall score', ['wpm', '400', 'quizScore', '100']],
  ])('rejects cached metrics with %s', async (_label, stats) => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json([{ result: stats }]))
    await expect(getTextLeaderboard('text-1')).rejects.toThrow(
      'Invalid cached leaderboard stats'
    )
  })

  it('preserves valid zero metrics instead of treating them as missing', async () => {
    request
      .mockResolvedValueOnce(Response.json([{ result: ['user-1', '0'] }]))
      .mockResolvedValueOnce(
        Response.json([
          { result: ['wpm', '0', 'quizScore', '0', 'overallScore', '0'] },
        ])
      )
    expect(await getTextLeaderboard('text-1')).toEqual({
      top: [
        {
          userId: 'user-1',
          username: null,
          avatarUrl: null,
          wpm: 0,
          quizScore: 0,
          overallScore: 0,
          rank: 1,
        },
      ],
      currentUser: null,
    })
  })

  it('rejects a missing command result instead of treating it as an empty cache', async () => {
    request.mockResolvedValueOnce(Response.json([]))
    await expect(getTextLeaderboard('text-1')).rejects.toThrow(
      'Invalid Redis pipeline response'
    )
  })

  it('keeps missing rank and score results distinct from transport failures', async () => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json(statsResponse))
      .mockResolvedValueOnce(
        Response.json([{ result: null }, { result: null }])
      )
    const result = await getTextLeaderboard('text-1', 'user-2')
    expect(result.top[0]).toMatchObject({ userId: 'user-1', wpm: 400 })
    expect(result.currentUser).toBeNull()
  })

  it('rejects rankings and stats from different cache updates', async () => {
    request
      .mockResolvedValueOnce(Response.json([{ result: ['user-1', '500'] }]))
      .mockResolvedValueOnce(Response.json(statsResponse))

    await expect(getTextLeaderboard('text-1')).rejects.toThrow(
      'Invalid cached leaderboard stats'
    )
  })

  it.each([
    ['negative', -1],
    ['non-numeric', 'invalid'],
    ['non-finite', 'Infinity'],
    ['empty', ''],
    ['null', null],
  ])('rejects a %s overall score in the ranking', async (_label, score) => {
    request
      .mockResolvedValueOnce(Response.json([{ result: ['user-1', score] }]))
      .mockResolvedValueOnce(Response.json(statsResponse))

    await expect(getTextLeaderboard('text-1')).rejects.toThrow(
      'Invalid cached leaderboard ranking'
    )
  })

  it('rejects an incomplete ranking instead of fabricating a score', async () => {
    request
      .mockResolvedValueOnce(Response.json([{ result: ['user-1'] }]))
      .mockResolvedValueOnce(Response.json(statsResponse))

    await expect(getTextLeaderboard('text-1')).rejects.toThrow(
      'Invalid cached leaderboard ranking'
    )
  })

  it.each([
    ['rank without score', 5, null],
    ['score without rank', null, 420],
    ['negative rank', -1, 420],
    ['fractional rank', 1.5, 420],
    ['non-numeric rank', 'invalid', 420],
    ['negative score', 5, -1],
    ['non-finite score', 5, 'Infinity'],
  ])('rejects a current-user pair with %s', async (_label, rank, score) => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json(statsResponse))
      .mockResolvedValueOnce(
        Response.json([{ result: rank }, { result: score }])
      )
      .mockResolvedValueOnce(Response.json([{ result: [] }]))

    await expect(getTextLeaderboard('text-1', 'user-2')).rejects.toThrow(
      'Invalid cached leaderboard ranking'
    )
  })

  it('rejects a current-user score that changed before stats were read', async () => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json(statsResponse))
      .mockResolvedValueOnce(Response.json([{ result: 5 }, { result: '420' }]))
      .mockResolvedValueOnce(Response.json(statsResponse))

    await expect(getTextLeaderboard('text-1', 'user-2')).rejects.toThrow(
      'Invalid cached leaderboard stats'
    )
  })

  it('returns a valid current-user ranking and matching metrics', async () => {
    request
      .mockResolvedValueOnce(Response.json(topResponse))
      .mockResolvedValueOnce(Response.json(statsResponse))
      .mockResolvedValueOnce(Response.json([{ result: 5 }, { result: '420' }]))
      .mockResolvedValueOnce(
        Response.json([
          {
            result: ['wpm', '200', 'quizScore', '80', 'overallScore', '420'],
          },
        ])
      )

    const result = await getTextLeaderboard('text-1', 'user-2')
    expect(result.currentUser).toEqual({
      userId: 'user-2',
      username: null,
      avatarUrl: null,
      wpm: 200,
      quizScore: 80,
      overallScore: 420,
      rank: 6,
    })
  })
})
