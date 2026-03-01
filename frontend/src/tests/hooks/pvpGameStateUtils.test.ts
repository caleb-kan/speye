import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  resolvePhaseFromGame,
  getReadingPhase,
  fetchClockOffset,
} from '../../hooks/usePvpGameState'

describe('getReadingPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns countdown when start time is in the future', () => {
    const futureStart = '2025-01-01T12:00:05.000Z'
    expect(getReadingPhase(futureStart, 0)).toBe('countdown')
  })

  it('returns reading when start time is in the past', () => {
    const pastStart = '2025-01-01T11:59:55.000Z'
    expect(getReadingPhase(pastStart, 0)).toBe('reading')
  })

  it('accounts for clock offset', () => {
    const futureStart = '2025-01-01T12:00:03.000Z'
    // With +5000ms offset, the adjusted start is 3s + 5s = 8s in the future
    expect(getReadingPhase(futureStart, 5000)).toBe('countdown')
  })

  it('returns reading when offset pushes start into the past', () => {
    const futureStart = '2025-01-01T12:00:03.000Z'
    // With -5000ms offset, the adjusted start is 3s - 5s = 2s in the past
    expect(getReadingPhase(futureStart, -5000)).toBe('reading')
  })

  it('throws on invalid timestamp', () => {
    expect(() => getReadingPhase('invalid-date', 0)).toThrow(
      'Invalid reading_started_at timestamp'
    )
  })
})

describe('resolvePhaseFromGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns results for completed game', () => {
    expect(resolvePhaseFromGame('completed', null, 0, 'pregame')).toBe(
      'results'
    )
  })

  it('defers results transition during reading and quiz phases', () => {
    expect(resolvePhaseFromGame('completed', null, 0, 'reading')).toBeNull()
    expect(resolvePhaseFromGame('completed', null, 0, 'quiz')).toBeNull()
  })

  it('returns results for completed game from waiting or pregame', () => {
    expect(resolvePhaseFromGame('completed', null, 0, 'waiting')).toBe(
      'results'
    )
    expect(resolvePhaseFromGame('completed', null, 0, 'pregame')).toBe(
      'results'
    )
  })

  it('returns results for abandoned game from pregame or waiting', () => {
    expect(resolvePhaseFromGame('abandoned', null, 0, 'pregame')).toBe(
      'results'
    )
    expect(resolvePhaseFromGame('abandoned', null, 0, 'waiting')).toBe(
      'results'
    )
  })

  it('defers abandoned game during reading or quiz', () => {
    expect(resolvePhaseFromGame('abandoned', null, 0, 'reading')).toBeNull()
    expect(resolvePhaseFromGame('abandoned', null, 0, 'quiz')).toBeNull()
  })

  it('returns countdown when active with future reading_started_at from pregame', () => {
    const futureStart = '2025-01-01T12:00:05.000Z'
    expect(resolvePhaseFromGame('active', futureStart, 0, 'pregame')).toBe(
      'countdown'
    )
  })

  it('returns reading when active with past reading_started_at from pregame', () => {
    const pastStart = '2025-01-01T11:59:55.000Z'
    expect(resolvePhaseFromGame('active', pastStart, 0, 'pregame')).toBe(
      'reading'
    )
  })

  it('returns reading when active with past reading_started_at from countdown', () => {
    const pastStart = '2025-01-01T11:59:55.000Z'
    expect(resolvePhaseFromGame('active', pastStart, 0, 'countdown')).toBe(
      'reading'
    )
  })

  it('returns null when active without reading_started_at', () => {
    expect(resolvePhaseFromGame('active', null, 0, 'pregame')).toBeNull()
  })

  it('returns null when pending', () => {
    expect(resolvePhaseFromGame('pending', null, 0, 'pregame')).toBeNull()
  })

  it('returns null for active game from quiz phase (no backward transition)', () => {
    const pastStart = '2025-01-01T11:59:55.000Z'
    expect(resolvePhaseFromGame('active', pastStart, 0, 'quiz')).toBeNull()
  })

  it('returns null for active game from waiting phase', () => {
    const pastStart = '2025-01-01T11:59:55.000Z'
    expect(resolvePhaseFromGame('active', pastStart, 0, 'waiting')).toBeNull()
  })

  it('does not transition from countdown to countdown', () => {
    const futureStart = '2025-01-01T12:00:05.000Z'
    expect(
      resolvePhaseFromGame('active', futureStart, 0, 'countdown')
    ).toBeNull()
  })
})

describe('fetchClockOffset', () => {
  it('throws on invalid server time after all retries', async () => {
    const { getServerTime } = await import('../../services/pvpService')
    vi.mocked(getServerTime).mockResolvedValue('invalid-date')

    await expect(fetchClockOffset()).rejects.toThrow(
      'Invalid server time response'
    )

    vi.mocked(getServerTime).mockResolvedValue('2025-01-01T12:00:00Z')
  })

  it('returns a numeric offset on valid server time', async () => {
    const { getServerTime } = await import('../../services/pvpService')
    vi.mocked(getServerTime).mockResolvedValue('2025-01-01T12:00:00Z')

    const offset = await fetchClockOffset()
    expect(typeof offset).toBe('number')
  })
})

vi.mock('../../services/pvpService', () => ({
  getPvpGame: vi.fn(),
  markReady: vi.fn(),
  getServerTime: vi.fn().mockResolvedValue('2025-01-01T12:00:00Z'),
  getTextForPvp: vi.fn(),
}))
