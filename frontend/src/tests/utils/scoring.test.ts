import { describe, it, expect } from 'vitest'
import { computeOverallScore, CHANCE_RATE } from '../../../../lib/scoring'
import { NUM_OPTIONS_PER_QUESTION } from '../../../../lib/quizConstants'

describe('computeOverallScore', () => {
  describe('zero and boundary cases', () => {
    it('returns 0 when wpm is 0', () => {
      expect(computeOverallScore(0, 100)).toBe(0)
    })

    it('returns 0 when quizScore is 0', () => {
      expect(computeOverallScore(400, 0)).toBe(0)
    })

    it('returns 0 when both are 0', () => {
      expect(computeOverallScore(0, 0)).toBe(0)
    })

    it('returns 0 when wpm is negative', () => {
      expect(computeOverallScore(-100, 80)).toBe(0)
    })

    it('returns 0 when quizScore is negative', () => {
      expect(computeOverallScore(400, -20)).toBe(0)
    })
  })

  describe('non-finite inputs', () => {
    it('returns 0 for NaN wpm', () => {
      expect(computeOverallScore(NaN, 100)).toBe(0)
    })

    it('returns 0 for NaN quizScore', () => {
      expect(computeOverallScore(400, NaN)).toBe(0)
    })

    it('returns 0 for Infinity wpm', () => {
      expect(computeOverallScore(Infinity, 100)).toBe(0)
    })

    it('returns 0 for Infinity quizScore', () => {
      expect(computeOverallScore(400, Infinity)).toBe(0)
    })

    it('returns 0 for -Infinity wpm', () => {
      expect(computeOverallScore(-Infinity, 100)).toBe(0)
    })
  })

  describe('edge function sync guard', () => {
    it('CHANCE_RATE matches NUM_OPTIONS_PER_QUESTION', () => {
      expect(CHANCE_RATE).toBe(1 / NUM_OPTIONS_PER_QUESTION)
    })

    it('NUM_OPTIONS_PER_QUESTION is 4', () => {
      expect(NUM_OPTIONS_PER_QUESTION).toBe(4)
    })
  })

  describe('chance-level correction', () => {
    it('returns 0 for 0/5 correct (0%)', () => {
      expect(computeOverallScore(400, 0)).toBe(0)
      expect(computeOverallScore(2000, 0)).toBe(0)
    })

    it('returns 0 for 1/5 correct (20%) -- at chance level', () => {
      expect(computeOverallScore(400, 20)).toBe(0)
      expect(computeOverallScore(2000, 20)).toBe(0)
      expect(computeOverallScore(10, 20)).toBe(0)
    })

    it('returns 0 for exactly chance level (25%)', () => {
      expect(computeOverallScore(400, 25)).toBe(0)
      expect(computeOverallScore(2000, 25)).toBe(0)
    })

    it('returns positive for 2/5 correct (40%) -- above chance', () => {
      expect(computeOverallScore(400, 40)).toBeGreaterThan(0)
    })
  })

  describe('monotonicity', () => {
    const wpmValues = [10, 100, 200, 400, 800, 2000]
    const quizValues = [0, 20, 40, 60, 80, 100]

    it('higher quiz score gives higher or equal score for any fixed WPM', () => {
      for (const wpm of wpmValues) {
        for (let i = 0; i < quizValues.length - 1; i++) {
          const lower = computeOverallScore(wpm, quizValues[i])
          const higher = computeOverallScore(wpm, quizValues[i + 1])
          expect(higher).toBeGreaterThanOrEqual(lower)
        }
      }
    })

    it('higher WPM gives higher or equal score for any fixed quiz above chance', () => {
      const aboveChanceQuiz = [40, 60, 80, 100]
      for (const quiz of aboveChanceQuiz) {
        for (let i = 0; i < wpmValues.length - 1; i++) {
          const lower = computeOverallScore(wpmValues[i], quiz)
          const higher = computeOverallScore(wpmValues[i + 1], quiz)
          expect(higher).toBeGreaterThanOrEqual(lower)
        }
      }
    })
  })

  describe('anti-gaming', () => {
    const baseline = computeOverallScore(400, 100)

    it('2000 WPM with 1/5 (20%) cannot beat 400 WPM with 5/5', () => {
      expect(computeOverallScore(2000, 20)).toBeLessThan(baseline)
    })

    it('2000 WPM with 2/5 (40%) cannot beat 400 WPM with 5/5', () => {
      expect(computeOverallScore(2000, 40)).toBeLessThan(baseline)
    })

    it('2000 WPM with 3/5 (60%) cannot beat 400 WPM with 5/5', () => {
      expect(computeOverallScore(2000, 60)).toBeLessThan(baseline)
    })
  })

  describe('comprehension dominance', () => {
    it('400 WPM / 5 correct beats 800 WPM / 3 correct', () => {
      expect(computeOverallScore(400, 100)).toBeGreaterThan(
        computeOverallScore(800, 60)
      )
    })

    it('200 WPM / 5 correct beats 2000 WPM / 1 correct', () => {
      expect(computeOverallScore(200, 100)).toBeGreaterThan(
        computeOverallScore(2000, 20)
      )
    })

    it('400 WPM / 4 correct beats 800 WPM / 2 correct', () => {
      expect(computeOverallScore(400, 80)).toBeGreaterThan(
        computeOverallScore(800, 40)
      )
    })
  })

  describe('diminishing returns on speed', () => {
    it('doubling WPM from 200 to 400 gives less than 2x score', () => {
      const low = computeOverallScore(200, 100)
      const high = computeOverallScore(400, 100)
      expect(high / low).toBeLessThan(2)
      expect(high / low).toBeGreaterThan(1)
    })

    it('marginal gain decreases as WPM increases', () => {
      const quiz = 100
      const gain200to400 =
        computeOverallScore(400, quiz) - computeOverallScore(200, quiz)
      const gain400to600 =
        computeOverallScore(600, quiz) - computeOverallScore(400, quiz)
      const gain600to800 =
        computeOverallScore(800, quiz) - computeOverallScore(600, quiz)

      expect(gain200to400).toBeGreaterThan(gain400to600)
      expect(gain400to600).toBeGreaterThan(gain600to800)
    })
  })

  describe('output validity', () => {
    it('always returns a non-negative integer', () => {
      const wpmValues = [10, 50, 100, 200, 400, 800, 1000, 2000]
      const quizValues = [0, 20, 40, 60, 80, 100]

      for (const wpm of wpmValues) {
        for (const quiz of quizValues) {
          const score = computeOverallScore(wpm, quiz)
          expect(score).toBeGreaterThanOrEqual(0)
          expect(Number.isInteger(score)).toBe(true)
          expect(Number.isFinite(score)).toBe(true)
        }
      }
    })
  })

  describe('known values', () => {
    it('400 WPM / 100% quiz gives 663', () => {
      expect(computeOverallScore(400, 100)).toBe(663)
    })

    it('400 WPM / 80% quiz gives 416', () => {
      expect(computeOverallScore(400, 80)).toBe(416)
    })

    it('400 WPM / 60% quiz gives 211', () => {
      expect(computeOverallScore(400, 60)).toBe(211)
    })

    it('400 WPM / 40% quiz gives 59', () => {
      expect(computeOverallScore(400, 40)).toBe(59)
    })
  })
})
