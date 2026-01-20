import { describe, it, expect } from 'vitest'
import { calculateReadability } from '../supabase/functions/textStat'

describe('calculateReadability', () => {
  describe('valid inputs', () => {
    it('should return a positive integer for normal text', () => {
      const text =
        'The quick brown fox jumps over the lazy dog. This is a simple sentence.'
      const result = calculateReadability(text)

      expect(result).toBeGreaterThanOrEqual(1)
      expect(Number.isInteger(result)).toBe(true)
    })

    it('should return higher scores for more complex text', () => {
      const simpleText = 'The cat sat on the mat. It was a nice day.'
      const complexText =
        'The epistemological ramifications of quantum mechanics fundamentally challenge our presuppositions.'

      const simpleScore = calculateReadability(simpleText)
      const complexScore = calculateReadability(complexText)

      expect(complexScore).toBeGreaterThan(simpleScore)
    })

    it('should allow scores above 15 for complex text', () => {
      const veryComplexText =
        'The phenomenological hermeneutics of existential ontology necessitates epistemological deconstruction of metaphysical presuppositions.'
      const result = calculateReadability(veryComplexText)

      expect(result).toBeGreaterThan(15)
    })
  })

  describe('edge cases', () => {
    it('should return 1 for empty string', () => {
      const result = calculateReadability('')
      expect(result).toBe(1)
    })

    it('should return minimum 1 for very simple text with negative grade', () => {
      const result = calculateReadability('Hi')
      expect(result).toBeGreaterThanOrEqual(1)
    })

    it('should return an integer', () => {
      const text = 'This is a test sentence with some words in it.'
      const result = calculateReadability(text)

      expect(Number.isInteger(result)).toBe(true)
    })

    it('should handle text with only punctuation', () => {
      const result = calculateReadability('...')
      expect(result).toBeGreaterThanOrEqual(1)
    })

    it('should handle text with numbers', () => {
      const result = calculateReadability(
        'In 2024, there were 100 people at the event.'
      )
      expect(result).toBeGreaterThanOrEqual(1)
    })
  })
})
