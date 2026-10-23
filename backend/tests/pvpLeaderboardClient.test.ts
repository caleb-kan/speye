import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPvpLeaderboard } from '../supabase/database/pvp/pvpRatings'

const { invoke, from } = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke }, from },
}))
vi.mock('../supabase/database/logger', () => ({ logDbQuery: vi.fn() }))

const leader = {
  user_id: 'leader',
  username: 'Leader',
  elo_rating: 1200,
  games_played: 5,
  wins: 3,
  losses: 1,
  draws: 1,
}
const player = {
  ...leader,
  user_id: 'player',
  username: 'Player',
  elo_rating: 900,
}
const databaseRow = ({ username, ...row }: typeof leader) => ({
  ...row,
  users: { username },
})

function queryResult(data: unknown, error: unknown = null, count?: number) {
  const result = { data, error, count }
  const query = {
    select: vi.fn(() => query),
    gt: vi.fn(() => query),
    eq: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown) =>
      Promise.resolve(result).then(resolve),
  }
  from.mockReturnValueOnce(query)
  return query
}

beforeEach(() => {
  from.mockReset()
  invoke.mockReset().mockResolvedValue({ data: { top: [leader] }, error: null })
})

describe('PvP cached top-five client and canonical player rank', () => {
  it('uses the authenticated Edge top without a direct top-five query', async () => {
    expect(await getPvpLeaderboard()).toEqual({
      top: [leader],
      currentUser: null,
    })
    expect(invoke).toHaveBeenCalledWith('pvp-leaderboard', { body: {} })
    expect(from).not.toHaveBeenCalled()
  })

  it('keeps an outside player rating and tied rank canonical', async () => {
    queryResult(databaseRow(player))
    const count = queryResult(null, null, 7)
    expect(await getPvpLeaderboard('player')).toEqual({
      top: [leader],
      currentUser: { ...player, rank: 8 },
    })
    expect(count.or).toHaveBeenCalledWith(
      'elo_rating.gt.900,and(elo_rating.eq.900,games_played.gt.5),and(elo_rating.eq.900,games_played.eq.5,user_id.lt.player)'
    )
  })

  it('reloads top five when a cached leader has just lost rating', async () => {
    const oldPlayer = { ...player, elo_rating: 1300 }
    invoke.mockResolvedValue({
      data: { top: [oldPlayer, leader] },
      error: null,
    })
    queryResult([databaseRow(leader)])
    queryResult(databaseRow(player))
    queryResult(null, null, 6)
    expect(await getPvpLeaderboard('player')).toEqual({
      top: [leader],
      currentUser: { ...player, rank: 7 },
    })
  })

  it('reloads top five when a canonical player has newly entered it', async () => {
    const promoted = { ...player, elo_rating: 1500 }
    queryResult(databaseRow(promoted))
    queryResult(null, null, 0)
    queryResult([databaseRow(promoted), databaseRow(leader)])
    expect(await getPvpLeaderboard('player')).toEqual({
      top: [promoted, leader],
      currentUser: null,
    })
  })

  it('uses fresh top-five stats for an existing leader without a separate stale player row', async () => {
    const fresh = { ...leader, games_played: 6, wins: 4 }
    queryResult([databaseRow(fresh)])
    expect(await getPvpLeaderboard('leader')).toEqual({
      top: [fresh],
      currentUser: null,
    })
    expect(from).toHaveBeenCalledOnce()
  })

  it('refreshes an empty shared cache when the player now has a canonical rank', async () => {
    invoke.mockResolvedValue({ data: { top: [] }, error: null })
    queryResult(databaseRow(player))
    queryResult(null, null, 6)
    queryResult([databaseRow(leader)])
    expect(await getPvpLeaderboard('player')).toEqual({
      top: [leader],
      currentUser: { ...player, rank: 7 },
    })
  })

  it('removes a cached player who no longer has eligible games', async () => {
    queryResult([])
    queryResult(null)
    expect(await getPvpLeaderboard('leader')).toEqual({
      top: [],
      currentUser: null,
    })
  })

  it('does not invent a rating or rank for a player without games', async () => {
    queryResult(null)
    expect(await getPvpLeaderboard('new-player')).toEqual({
      top: [leader],
      currentUser: null,
    })
    expect(from).toHaveBeenCalledOnce()
  })

  it.each([
    { data: null, error: { message: 'Edge unavailable' } },
    { data: { top: [{ ...leader, elo_rating: '1200' }] }, error: null },
    { data: { top: [{ ...leader, games_played: 0 }] }, error: null },
    { data: { top: null }, error: null },
  ])(
    'falls back to the ordered direct query on Edge failure or invalid output (%j)',
    async (result) => {
      invoke.mockResolvedValue(result)
      const query = queryResult([databaseRow(leader)])
      expect(await getPvpLeaderboard()).toEqual({
        top: [leader],
        currentUser: null,
      })
      expect(query.gt).toHaveBeenCalledWith('games_played', 0)
      expect(query.order.mock.calls).toEqual([
        ['elo_rating', { ascending: false }],
        ['games_played', { ascending: false }],
        ['user_id', { ascending: true }],
      ])
      expect(query.limit).toHaveBeenCalledWith(5)
    }
  )

  it('falls back when Edge invocation rejects', async () => {
    invoke.mockRejectedValue(new Error('Offline'))
    queryResult([databaseRow(leader)])
    expect(await getPvpLeaderboard()).toEqual({
      top: [leader],
      currentUser: null,
    })
  })

  it('keeps a direct fallback current leader fresh without a duplicate query', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Edge down' } })
    queryResult([databaseRow(leader)])
    expect(await getPvpLeaderboard('leader')).toEqual({
      top: [leader],
      currentUser: null,
    })
    expect(from).toHaveBeenCalledOnce()
  })

  it('propagates a canonical rank failure instead of displaying a stale rank', async () => {
    const error = { message: 'Rank unavailable' }
    queryResult(databaseRow(player))
    queryResult(null, error)
    await expect(getPvpLeaderboard('player')).rejects.toBe(error)
  })

  it('propagates a canonical top failure when the player cache must be bypassed', async () => {
    const error = { message: 'Top unavailable' }
    queryResult(null, error)
    await expect(getPvpLeaderboard('leader')).rejects.toBe(error)
  })
})
