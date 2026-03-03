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
  it('returns Baby Snail for elo 0', () => {
    expect(getRankFromElo(0).tier).toBe('Baby Snail')
  })

  it('returns Baby Snail for negative elo', () => {
    expect(getRankFromElo(-100).tier).toBe('Baby Snail')
  })

  it('returns Baby Snail at 1099', () => {
    expect(getRankFromElo(1099).tier).toBe('Baby Snail')
  })

  it('returns Young Snail at exactly 1100', () => {
    expect(getRankFromElo(1100).tier).toBe('Young Snail')
  })

  it('returns Young Snail at 1199', () => {
    expect(getRankFromElo(1199).tier).toBe('Young Snail')
  })

  it('returns Prime Snail at exactly 1200', () => {
    expect(getRankFromElo(1200).tier).toBe('Prime Snail')
  })

  it('returns Baby Turtle at exactly 1300', () => {
    expect(getRankFromElo(1300).tier).toBe('Baby Turtle')
  })

  it('returns Baby Rabbit at exactly 1600', () => {
    expect(getRankFromElo(1600).tier).toBe('Baby Rabbit')
  })

  it('returns Baby Sparrow at exactly 1900', () => {
    expect(getRankFromElo(1900).tier).toBe('Baby Sparrow')
  })

  it('returns Baby Chimp at exactly 2200', () => {
    expect(getRankFromElo(2200).tier).toBe('Baby Chimp')
  })

  it('returns Prime Cheetah at 2800', () => {
    expect(getRankFromElo(2800).tier).toBe('Prime Cheetah')
  })

  it('returns Prime Cheetah for very high elo', () => {
    expect(getRankFromElo(5000).tier).toBe('Prime Cheetah')
  })

  it('returns correct colors per animal', () => {
    expect(getRankFromElo(500).color).toBe('#CD7F32') // Snail
    expect(getRankFromElo(1300).color).toBe('#A8B4C0') // Turtle
    expect(getRankFromElo(1600).color).toBe('#FFD700') // Rabbit
    expect(getRankFromElo(1900).color).toBe('#00CED1') // Sparrow
    expect(getRankFromElo(2200).color).toBe('#B388FF') // Chimp
    expect(getRankFromElo(2500).color).toBe('#FF1744') // Cheetah
  })

  it('returns emoji for each animal', () => {
    expect(getRankFromElo(500).emoji).toBe('\u{1F40C}') // Snail
    expect(getRankFromElo(1300).emoji).toBe('\u{1F422}') // Turtle
    expect(getRankFromElo(1600).emoji).toBe('\u{1F407}') // Rabbit
    expect(getRankFromElo(1900).emoji).toBe('\u{1F426}') // Sparrow
    expect(getRankFromElo(2200).emoji).toBe('\u{1F435}') // Chimp
    expect(getRankFromElo(2500).emoji).toBe('\u{1F406}') // Cheetah
  })

  it('returns correct level for each sub-tier', () => {
    // Baby = first sub-tier of each animal
    expect(getRankFromElo(500).level).toBe('Baby') // Baby Snail
    expect(getRankFromElo(1300).level).toBe('Baby') // Baby Turtle
    // Young = second sub-tier
    expect(getRankFromElo(1100).level).toBe('Young') // Young Snail
    expect(getRankFromElo(1400).level).toBe('Young') // Young Turtle
    // Prime = third sub-tier
    expect(getRankFromElo(1200).level).toBe('Prime') // Prime Snail
    expect(getRankFromElo(1500).level).toBe('Prime') // Prime Turtle
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
    expect(getProgressToNextTier(1100)).toBe(0)
    expect(getProgressToNextTier(1300)).toBe(0)
  })

  it('returns 100 for Prime Cheetah tier', () => {
    expect(getProgressToNextTier(2700)).toBe(100)
    expect(getProgressToNextTier(5000)).toBe(100)
  })

  it('returns mid-range progress correctly', () => {
    // Young Snail: 1100-1199, range = 100
    // 1150 - 1100 = 50/100 = 50%
    expect(getProgressToNextTier(1150)).toBe(50)
  })

  it('returns close to 100 near tier boundary', () => {
    // Baby Snail: 0-1099, range = 1100
    // 1099 - 0 = 1099/1100 ~ 100%
    expect(getProgressToNextTier(1099)).toBeGreaterThanOrEqual(99)
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
