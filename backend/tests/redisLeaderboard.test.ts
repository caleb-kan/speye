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
    ['missing score', ['wpm', '400']],
    ['invalid WPM', ['wpm', 'invalid', 'quizScore', '100']],
    ['non-finite score', ['wpm', '400', 'quizScore', 'Infinity']],
    ['out-of-range score', ['wpm', '400', 'quizScore', '101']],
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
        Response.json([{ result: ['wpm', '0', 'quizScore', '0'] }])
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
})
