import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTimeAgo,
  getPlayerPrefix,
  getPlayerData,
  getMatchResult,
  readPendingSubmit,
  writePendingSubmit,
  clearPendingSubmit,
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

  it('writes and reads pending submit', () => {
    const success = writePendingSubmit('game-1', 'pvp-submit-', {
      wpm: 300,
      score: 80,
    })
    expect(success).toBe(true)
    const result = readPendingSubmit('game-1', 'pvp-submit-')
    expect(result).toEqual({ wpm: 300, score: 80 })
  })

  it('returns false when sessionStorage.setItem throws', () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const proto = Object.getPrototypeOf(sessionStorage)
    const original = proto.setItem
    proto.setItem = () => {
      throw new DOMException('QuotaExceededError')
    }
    const success = writePendingSubmit('game-1', 'pvp-submit-', {
      wpm: 300,
      score: 80,
    })
    expect(success).toBe(false)
    proto.setItem = original
    warnSpy.mockRestore()
  })

  it('returns null for missing submit', () => {
    expect(readPendingSubmit('nonexistent', 'pvp-submit-')).toBeNull()
  })

  it('clears pending submit', () => {
    writePendingSubmit('game-1', 'pvp-submit-', { wpm: 300, score: 80 })
    clearPendingSubmit('game-1', 'pvp-submit-')
    expect(readPendingSubmit('game-1', 'pvp-submit-')).toBeNull()
  })

  it('returns null for invalid shape', () => {
    sessionStorage.setItem('pvp-submit-game-1', JSON.stringify({ bad: true }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'pvp-submit-')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for invalid JSON', () => {
    sessionStorage.setItem('pvp-submit-game-1', 'not-json')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'pvp-submit-')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for negative wpm', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1',
      JSON.stringify({ wpm: -1, score: 80 })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'pvp-submit-')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for score over 100', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1',
      JSON.stringify({ wpm: 300, score: 150 })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'pvp-submit-')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for negative score', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1',
      JSON.stringify({ wpm: 300, score: -10 })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'pvp-submit-')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for Infinity wpm', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1',
      JSON.stringify({ wpm: Infinity, score: 80 })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'pvp-submit-')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for NaN score', () => {
    sessionStorage.setItem(
      'pvp-submit-game-1',
      JSON.stringify({ wpm: 300, score: NaN })
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(readPendingSubmit('game-1', 'pvp-submit-')).toBeNull()
    spy.mockRestore()
  })
})
