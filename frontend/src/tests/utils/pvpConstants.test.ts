import { describe, it, expect } from 'vitest'
import { RANK_TIERS, MILESTONE_TYPES } from '../../constants/pvp'
import {
  getRankFromElo,
  getProgressToNextTier,
  formatElapsedTime,
  computeWinRate,
  eloChangeColor,
} from '../../utils/pvp'

describe('getRankFromElo', () => {
  it('returns Bronze for elo 0', () => {
    expect(getRankFromElo(0).tier).toBe('Bronze')
  })

  it('returns Bronze for negative elo', () => {
    expect(getRankFromElo(-100).tier).toBe('Bronze')
  })

  it('returns Bronze at 1049', () => {
    expect(getRankFromElo(1049).tier).toBe('Bronze')
  })

  it('returns Silver at exactly 1050', () => {
    expect(getRankFromElo(1050).tier).toBe('Silver')
  })

  it('returns Silver at 1199', () => {
    expect(getRankFromElo(1199).tier).toBe('Silver')
  })

  it('returns Gold at exactly 1200', () => {
    expect(getRankFromElo(1200).tier).toBe('Gold')
  })

  it('returns Gold at 1349', () => {
    expect(getRankFromElo(1349).tier).toBe('Gold')
  })

  it('returns Platinum at exactly 1350', () => {
    expect(getRankFromElo(1350).tier).toBe('Platinum')
  })

  it('returns Platinum at 1499', () => {
    expect(getRankFromElo(1499).tier).toBe('Platinum')
  })

  it('returns Diamond at exactly 1500', () => {
    expect(getRankFromElo(1500).tier).toBe('Diamond')
  })

  it('returns Diamond at 1649', () => {
    expect(getRankFromElo(1649).tier).toBe('Diamond')
  })

  it('returns Master at exactly 1650', () => {
    expect(getRankFromElo(1650).tier).toBe('Master')
  })

  it('returns Master for very high elo', () => {
    expect(getRankFromElo(5000).tier).toBe('Master')
  })

  it('returns correct colors', () => {
    expect(getRankFromElo(500).color).toBe('#CD7F32')
    expect(getRankFromElo(1100).color).toBe('#A8B4C0')
    expect(getRankFromElo(1650).color).toBe('#FF1744')
  })

  it('rank tiers are contiguous with no gaps', () => {
    for (let i = 1; i < RANK_TIERS.length; i++) {
      const prev = RANK_TIERS[i - 1]
      const curr = RANK_TIERS[i]
      expect(curr.minElo).toBe(prev.maxElo! + 1)
    }
  })

  it('first tier starts at 0', () => {
    expect(RANK_TIERS[0].minElo).toBe(0)
  })

  it('last tier has null maxElo', () => {
    expect(RANK_TIERS[RANK_TIERS.length - 1].maxElo).toBeNull()
  })
})

describe('getProgressToNextTier', () => {
  it('returns 0 at the start of a tier', () => {
    expect(getProgressToNextTier(0)).toBe(0)
    expect(getProgressToNextTier(1050)).toBe(0)
    expect(getProgressToNextTier(1200)).toBe(0)
  })

  it('returns 100 for Master tier', () => {
    expect(getProgressToNextTier(1650)).toBe(100)
    expect(getProgressToNextTier(3000)).toBe(100)
  })

  it('returns mid-range progress correctly', () => {
    // Silver: 1050-1199, range = 150
    // 1100 - 1050 = 50/150 = 33%
    expect(getProgressToNextTier(1100)).toBe(33)
  })

  it('returns close to 100 near tier boundary', () => {
    // Bronze: 0-1049, range = 1050
    // 1049 - 0 = 1049/1050 ~ 100%
    expect(getProgressToNextTier(1049)).toBeGreaterThanOrEqual(99)
  })

  it('never exceeds 100', () => {
    for (let elo = 0; elo <= 3000; elo += 50) {
      expect(getProgressToNextTier(elo)).toBeLessThanOrEqual(100)
    }
  })

  it('never goes below 0', () => {
    for (let elo = 0; elo <= 3000; elo += 50) {
      expect(getProgressToNextTier(elo)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('formatElapsedTime', () => {
  it('formats 0 seconds', () => {
    expect(formatElapsedTime(0)).toBe('0:00')
  })

  it('formats single digit seconds', () => {
    expect(formatElapsedTime(5)).toBe('0:05')
  })

  it('formats full minutes', () => {
    expect(formatElapsedTime(60)).toBe('1:00')
  })

  it('formats mixed minutes and seconds', () => {
    expect(formatElapsedTime(90)).toBe('1:30')
  })

  it('formats double digit minutes', () => {
    expect(formatElapsedTime(720)).toBe('12:00')
  })
})

describe('computeWinRate', () => {
  it('returns 0 when no games played', () => {
    expect(computeWinRate(0, 0)).toBe(0)
  })

  it('returns 100 when all games won', () => {
    expect(computeWinRate(10, 10)).toBe(100)
  })

  it('returns correct percentage', () => {
    expect(computeWinRate(3, 10)).toBe(30)
  })

  it('rounds to nearest integer', () => {
    expect(computeWinRate(1, 3)).toBe(33)
  })
})

describe('eloChangeColor', () => {
  it('returns success for positive change', () => {
    expect(eloChangeColor(10)).toBe('text-success')
  })

  it('returns error for negative change', () => {
    expect(eloChangeColor(-5)).toBe('text-error')
  })

  it('returns secondary for zero change', () => {
    expect(eloChangeColor(0)).toBe('text-text-secondary')
  })
})

describe('MILESTONE_TYPES', () => {
  it('contains all expected milestone types', () => {
    expect(MILESTONE_TYPES).toContain('halfway')
    expect(MILESTONE_TYPES).toContain('started_quiz')
    expect(MILESTONE_TYPES).toContain('finished')
    expect(MILESTONE_TYPES).toHaveLength(3)
  })
})
