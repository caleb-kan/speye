import { describe, it, expect } from 'vitest'
import {
  wpmToMsPerWord,
  calculateWpmFromReading,
} from '../../utils/wpmCalculations'

describe('wpmToMsPerWord', () => {
  it('converts 60 WPM to 1000 ms/word', () => {
    expect(wpmToMsPerWord(60)).toBe(1000)
  })

  it('converts 300 WPM to 200 ms/word', () => {
    expect(wpmToMsPerWord(300)).toBe(200)
  })
})

describe('calculateWpmFromReading', () => {
  it('calculates 100 WPM for 100 words in 60 seconds', () => {
    expect(calculateWpmFromReading(100, 60000)).toBe(100)
  })

  it('calculates 200 WPM for 100 words in 30 seconds', () => {
    expect(calculateWpmFromReading(100, 30000)).toBe(200)
  })

  it('rounds to nearest integer', () => {
    // 7 words in 10 seconds = 42 WPM
    expect(calculateWpmFromReading(7, 10000)).toBe(42)
  })

  describe('invalid inputs return 0', () => {
    it('returns 0 for zero elapsed time', () => {
      expect(calculateWpmFromReading(100, 0)).toBe(0)
    })

    it('returns 0 for negative elapsed time', () => {
      expect(calculateWpmFromReading(100, -5000)).toBe(0)
    })

    it('returns 0 for zero words', () => {
      expect(calculateWpmFromReading(0, 60000)).toBe(0)
    })

    it('returns 0 for negative words', () => {
      expect(calculateWpmFromReading(-10, 60000)).toBe(0)
    })

    it('returns 0 for NaN elapsed time', () => {
      expect(calculateWpmFromReading(100, NaN)).toBe(0)
    })

    it('returns 0 for NaN words', () => {
      expect(calculateWpmFromReading(NaN, 60000)).toBe(0)
    })

    it('returns 0 for Infinity elapsed time', () => {
      expect(calculateWpmFromReading(100, Infinity)).toBe(0)
    })

    it('returns 0 for Infinity words', () => {
      expect(calculateWpmFromReading(Infinity, 60000)).toBe(0)
    })

    it('returns 0 for -Infinity elapsed time', () => {
      expect(calculateWpmFromReading(100, -Infinity)).toBe(0)
    })

    it('returns 0 for -Infinity words', () => {
      expect(calculateWpmFromReading(-Infinity, 60000)).toBe(0)
    })
  })
})
