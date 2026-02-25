import { describe, it, expect } from 'vitest'
import {
  buildPhrases,
  getPhraseWordCounts,
  getCumulativeWordCounts,
  findPhraseIndexForWord,
} from '../../utils/rsvpPhrasing'

describe('rsvpPhrasing', () => {
  describe('buildPhrases', () => {
    it('returns empty array for empty input', () => {
      expect(buildPhrases([], 20)).toEqual([])
    })

    it('returns single phrase for one short word', () => {
      expect(buildPhrases(['hello'], 20)).toEqual(['hello'])
    })

    it('groups multiple words fitting in one phrase', () => {
      expect(buildPhrases(['the', 'cat', 'sat'], 20)).toEqual(['the cat sat'])
    })

    it('splits into multiple phrases when words exceed phrase size', () => {
      const words = ['hello', 'world', 'foo', 'bar']
      // "hello world" = 11 chars, "foo bar" = 7 chars
      const result = buildPhrases(words, 12)
      expect(result).toEqual(['hello world', 'foo bar'])
    })

    it('keeps a single word longer than maxCharsPerPhrase as its own phrase', () => {
      const words = ['superlongword', 'hi']
      const result = buildPhrases(words, 5)
      expect(result).toEqual(['superlongword', 'hi'])
    })

    it('handles word exactly filling remaining space', () => {
      // "ab cd" = 5 chars, fits in maxCharsPerPhrase=5
      // Adding "ef" would be "ab cd ef" = 8 chars, exceeds 5
      const result = buildPhrases(['ab', 'cd', 'ef'], 5)
      expect(result).toEqual(['ab cd', 'ef'])
    })

    it('creates individual phrases when maxCharsPerPhrase is very small', () => {
      const result = buildPhrases(['a', 'b', 'c'], 1)
      expect(result).toEqual(['a', 'b', 'c'])
    })
  })

  describe('getPhraseWordCounts', () => {
    it('returns empty array for empty input', () => {
      expect(getPhraseWordCounts([])).toEqual([])
    })

    it('returns [1, 1, ...] for single-word phrases', () => {
      expect(getPhraseWordCounts(['hello', 'world'])).toEqual([1, 1])
    })

    it('returns correct counts for multi-word phrases', () => {
      expect(getPhraseWordCounts(['hello world', 'foo bar baz'])).toEqual([
        2, 3,
      ])
    })

    it('handles phrases with extra whitespace correctly', () => {
      // split(/\s+/).filter(Boolean) handles this
      expect(getPhraseWordCounts(['  hello  world  '])).toEqual([2])
    })
  })

  describe('getCumulativeWordCounts', () => {
    it('returns empty array for empty input', () => {
      expect(getCumulativeWordCounts([])).toEqual([])
    })

    it('returns cumulative start positions', () => {
      // phraseWordCounts [2, 3, 1] → cumulative starts [0, 2, 5]
      expect(getCumulativeWordCounts([2, 3, 1])).toEqual([0, 2, 5])
    })

    it('handles single phrase', () => {
      expect(getCumulativeWordCounts([5])).toEqual([0])
    })

    it('handles all single-word phrases', () => {
      expect(getCumulativeWordCounts([1, 1, 1])).toEqual([0, 1, 2])
    })
  })

  describe('findPhraseIndexForWord', () => {
    // cumulative [0, 2, 5] means phrase 0 starts at word 0, phrase 1 at word 2, phrase 2 at word 5
    const cumulative = [0, 2, 5]
    const totalPhrases = 3

    it('returns 0 for wordIndex=0', () => {
      expect(findPhraseIndexForWord(cumulative, 0, totalPhrases)).toBe(0)
    })

    it('returns correct phrase for word in middle of phrase', () => {
      // word 3 is in phrase 1 (starts at 2, next starts at 5)
      expect(findPhraseIndexForWord(cumulative, 3, totalPhrases)).toBe(1)
    })

    it('returns correct phrase at phrase boundary', () => {
      // word 2 is the start of phrase 1
      expect(findPhraseIndexForWord(cumulative, 2, totalPhrases)).toBe(1)
    })

    it('returns correct phrase for word in last phrase', () => {
      expect(findPhraseIndexForWord(cumulative, 5, totalPhrases)).toBe(2)
    })

    it('returns 0 when totalPhrases <= 0', () => {
      expect(findPhraseIndexForWord(cumulative, 3, 0)).toBe(0)
      expect(findPhraseIndexForWord(cumulative, 3, -1)).toBe(0)
    })

    it('clamps to totalPhrases - 1', () => {
      // Even with a very large wordIndex, should not exceed totalPhrases - 1
      expect(findPhraseIndexForWord(cumulative, 100, totalPhrases)).toBe(2)
    })

    it('returns 0 for negative wordIndex', () => {
      expect(findPhraseIndexForWord(cumulative, -1, totalPhrases)).toBe(0)
    })
  })
})
