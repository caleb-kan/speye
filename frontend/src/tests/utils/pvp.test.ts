import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTimeAgo,
  getPlayerPrefix,
  getPlayerData,
  getMatchResult,
  readPendingSubmit,
  writePendingSubmit,
  clearPendingSubmit,
  readPvpReadingSession,
  writePvpReadingSession,
  clearPvpReadingSession,
} from '../../utils/pvp'
import { makeGame as makeBaseGame } from '../helpers/pvpMockFactory'
import type { PvpGame } from '../../types/database'

function makeGame(overrides: Partial<PvpGame> = {}): PvpGame {
  return makeBaseGame({
    status: 'completed',
    winner_id: 'user-1',
    player1_wpm: 300,
    player1_quiz_score: 80,
    player1_overall_score: 100,
    player1_finished_at: '2025-01-01T12:01:00Z',
    player2_wpm: 250,
    player2_quiz_score: 60,
    player2_overall_score: 70,
    player2_finished_at: '2025-01-01T12:01:30Z',
    player1_progress: 100,
    player2_progress: 100,
    player1_elo_before: 1000,
    player2_elo_before: 1100,
    player1_elo_change: 25,
    player2_elo_change: -25,
    reading_started_at: '2025-01-01T12:00:05Z',
    finished_at: '2025-01-01T12:02:00Z',
    ...overrides,
  })
}

// getRankFromElo, formatElapsedTime, getProgressToNextTier, computeWinRate,
// and eloChangeColor are tested more thoroughly in pvpConstants.test.ts.

describe('getTimeAgo', () => {
  it('returns "now" for recent times', () => {
    expect(getTimeAgo(new Date().toISOString())).toBe('now')
  })

  it('returns minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(getTimeAgo(fiveMinAgo)).toBe('5m')
  })

  it('returns hours', () => {
    const twoHrsAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(getTimeAgo(twoHrsAgo)).toBe('2h')
  })

  it('returns days', () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(getTimeAgo(threeDaysAgo)).toBe('3d')
  })

  it('returns placeholder for invalid date', () => {
    expect(getTimeAgo('invalid')).toBe('--')
  })
})

describe('getPlayerPrefix', () => {
  it('returns player1 as my prefix when user is player1', () => {
    const result = getPlayerPrefix('user-1', 'user-1')
    expect(result).toEqual({ myPrefix: 'player1', oppPrefix: 'player2' })
  })

  it('returns player2 as my prefix when user is player2', () => {
    const result = getPlayerPrefix('user-2', 'user-1')
    expect(result).toEqual({ myPrefix: 'player2', oppPrefix: 'player1' })
  })
})

describe('getPlayerData', () => {
  it('extracts player1 data', () => {
    const game = makeGame()
    const data = getPlayerData(game, 'player1')
    expect(data.wpm).toBe(300)
    expect(data.quiz_score).toBe(80)
    expect(data.overall_score).toBe(100)
    expect(data.elo_before).toBe(1000)
    expect(data.elo_change).toBe(25)
    expect(data.progress).toBe(100)
    expect(data.ready).toBe(true)
  })

  it('extracts player2 data', () => {
    const game = makeGame()
    const data = getPlayerData(game, 'player2')
    expect(data.wpm).toBe(250)
    expect(data.quiz_score).toBe(60)
    expect(data.overall_score).toBe(70)
    expect(data.elo_before).toBe(1100)
    expect(data.elo_change).toBe(-25)
  })

  it('handles null fields', () => {
    const game = makeGame({
      player1_wpm: null,
      player1_elo_before: null,
    })
    const data = getPlayerData(game, 'player1')
    expect(data.wpm).toBeNull()
    expect(data.elo_before).toBeNull()
  })
})

describe('getMatchResult', () => {
  it('returns win when user is the winner', () => {
    expect(getMatchResult('user-1', 'user-1', false)).toBe('win')
  })

  it('returns draw when no winner and no forfeit', () => {
    expect(getMatchResult(null, 'user-1', false)).toBe('draw')
  })

  it('returns loss when opponent is the winner', () => {
    expect(getMatchResult('user-2', 'user-1', false)).toBe('loss')
  })

  it('returns loss when no winner but was a forfeit', () => {
    expect(getMatchResult(null, 'user-1', true)).toBe('loss')
  })

  it('returns win on forfeit when user is still the winner', () => {
    expect(getMatchResult('user-1', 'user-1', true)).toBe('win')
  })
})

describe('sessionStorage pending submit', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('rejects an ownerless legacy result without losing the verified current-owner result', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1',
      JSON.stringify({ wpm: 300, score: 80 })
    )
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    writePendingSubmit('game-1', 'user-1', { wpm: 300, score: 80 })
    expect(readPendingSubmit('game-1', 'user-1')).toEqual({
      wpm: 300,
      score: 80,
    })
    expect(sessionStorage.getItem('pvp-submit-game-1')).toBeNull()
  })

  it('isolates pending results for the two participants of the same game', () => {
    writePendingSubmit('game-1', 'user-1', { wpm: 300, score: 80 })
    expect(readPendingSubmit('game-1', 'user-2')).toBeNull()
    writePendingSubmit('game-1', 'user-2', { wpm: 400, score: 90 })
    clearPendingSubmit('game-1', 'user-1')
    expect(readPendingSubmit('game-1', 'user-2')).toEqual({
      wpm: 400,
      score: 90,
    })
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
  })

  it.each([
    { gameId: 'game-1', userId: 'user-2' },
    { gameId: 'game-2', userId: 'user-1' },
  ])('rejects a mismatched pending-result owner or game', (owner) => {
    sessionStorage.setItem(
      'pvp-submit-game-1:user-1',
      JSON.stringify({ ...owner, wpm: 300, score: 80 })
    )
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    expect(sessionStorage.getItem('pvp-submit-game-1:user-1')).toBeNull()
    writePendingSubmit('game-1', 'user-1', { wpm: 300, score: 80 })
    expect(readPendingSubmit('game-1', 'user-1')).toEqual({
      wpm: 300,
      score: 80,
    })
  })

  it('writes and reads pending submit', () => {
    const success = writePendingSubmit('game-1', 'user-1', {
      wpm: 300,
      score: 80,
    })
    expect(success).toBe(true)
    const result = readPendingSubmit('game-1', 'user-1')
    expect(result).toEqual({ wpm: 300, score: 80 })
  })

  it('returns false when sessionStorage.setItem throws', () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const proto = Object.getPrototypeOf(sessionStorage)
    const original = proto.setItem
    proto.setItem = () => {
      throw new DOMException('QuotaExceededError')
    }
    const success = writePendingSubmit('game-1', 'user-1', {
      wpm: 300,
      score: 80,
    })
    expect(success).toBe(false)
    proto.setItem = original
    warnSpy.mockRestore()
  })

  it('returns null for missing submit', () => {
    expect(readPendingSubmit('nonexistent', 'user-1')).toBeNull()
  })

  it('clears pending submit', () => {
    writePendingSubmit('game-1', 'user-1', { wpm: 300, score: 80 })
    clearPendingSubmit('game-1', 'user-1')
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
  })

  it('returns null for invalid shape', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1:user-1',
      JSON.stringify({ bad: true, gameId: 'game-1', userId: 'user-1' })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for invalid JSON', () => {
    sessionStorage.setItem('pvp-submit-game-1:user-1', 'not-json')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for negative wpm', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1:user-1',
      JSON.stringify({ gameId: 'game-1', userId: 'user-1', wpm: -1, score: 80 })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for score over 100', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1:user-1',
      JSON.stringify({
        gameId: 'game-1',
        userId: 'user-1',
        wpm: 300,
        score: 150,
      })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for negative score', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1:user-1',
      JSON.stringify({
        gameId: 'game-1',
        userId: 'user-1',
        wpm: 300,
        score: -10,
      })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for Infinity wpm', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1:user-1',
      JSON.stringify({
        gameId: 'game-1',
        userId: 'user-1',
        wpm: Infinity,
        score: 80,
      })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for NaN score', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1:user-1',
      JSON.stringify({
        gameId: 'game-1',
        userId: 'user-1',
        wpm: 300,
        score: NaN,
      })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'user-1')).toBeNull()
    spy.mockRestore()
  })
})

describe('saved PvP readings', () => {
  beforeEach(() => sessionStorage.clear())
  const snapshot = {
    wordIndex: 4,
    readingStartedAt: '2025-01-01T12:00:00Z',
    gameStartedAt: Date.parse('2025-01-01T12:00:00Z'),
    completedWpm: null,
  }

  it('restores only the specified game and account', () => {
    writePvpReadingSession('game-1', 'user-1', snapshot)
    expect(readPvpReadingSession('game-1', 'user-1', 10)).toEqual(snapshot)
    expect(readPvpReadingSession('game-2', 'user-1', 10)).toBeNull()
    expect(readPvpReadingSession('game-1', 'user-2', 10)).toBeNull()
    clearPvpReadingSession('game-1', 'user-1')
    expect(readPvpReadingSession('game-1', 'user-1', 10)).toBeNull()
  })

  it.each([
    'not-json',
    'null',
    JSON.stringify({ ...snapshot, wordIndex: -1 }),
    JSON.stringify({ ...snapshot, wordIndex: 11 }),
    JSON.stringify({ ...snapshot, wordIndex: 1.5 }),
    JSON.stringify({ ...snapshot, readingStartedAt: 'invalid' }),
    JSON.stringify({ ...snapshot, readingStartedAt: '2999-01-01' }),
    JSON.stringify({ ...snapshot, gameStartedAt: '100' }),
    JSON.stringify({ ...snapshot, gameStartedAt: -1 }),
    JSON.stringify({ ...snapshot, completedWpm: 100 }),
    JSON.stringify({ ...snapshot, wordIndex: 10, completedWpm: -1 }),
    JSON.stringify({ ...snapshot, wordIndex: 10, completedWpm: 2001 }),
  ])('rejects malformed or out-of-range reading data (%s)', (stored) => {
    writePvpReadingSession('valid-game', 'user-1', snapshot)
    sessionStorage.setItem('pvp-submit-reading:game-1:user-1', stored)
    expect(readPvpReadingSession('game-1', 'user-1', 10)).toBeNull()
    expect(
      sessionStorage.getItem('pvp-submit-reading:game-1:user-1')
    ).toBeNull()
    expect(readPvpReadingSession('valid-game', 'user-1', 10)).toEqual(snapshot)
  })

  it('preserves a completed reading independently of its pending submission', () => {
    writePvpReadingSession('game-1', 'user-1', {
      ...snapshot,
      wordIndex: 10,
      completedWpm: 100,
    })
    writePendingSubmit('game-1', 'user-1', { wpm: 100, score: 80 })
    clearPvpReadingSession('game-1', 'user-1')
    expect(readPendingSubmit('game-1', 'user-1')).toEqual({
      wpm: 100,
      score: 80,
    })
  })

  it('tolerates unavailable session storage', () => {
    const spy = vi
      .spyOn(Object.getPrototypeOf(sessionStorage), 'setItem')
      .mockImplementation(() => {
        throw new Error('storage unavailable')
      })
    writePvpReadingSession('game-1', 'user-1', snapshot)
    spy.mockRestore()
    expect(readPvpReadingSession('game-1', 'user-1', 10)).toBeNull()
    writePvpReadingSession('game-1', 'user-1', snapshot)
    expect(readPvpReadingSession('game-1', 'user-1', 10)).toEqual(snapshot)
  })
})
