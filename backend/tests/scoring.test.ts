import { describe, it, expect } from 'vitest'
import {
  computeOverallScore,
  CHANCE_RATE,
  COMPREHENSION_EXPONENT,
  SPEED_EXPONENT,
  SCORE_SCALE,
} from '../../lib/scoring'

describe('computeOverallScore', () => {
  it('returns 0 for NaN wpm', () => {
    expect(computeOverallScore(NaN, 80)).toBe(0)
  })

  it('returns 0 for NaN quizScore', () => {
    expect(computeOverallScore(200, NaN)).toBe(0)
  })

  it('returns 0 for Infinity wpm', () => {
    expect(computeOverallScore(Infinity, 80)).toBe(0)
  })

  it('returns 0 for negative wpm', () => {
    expect(computeOverallScore(-100, 80)).toBe(0)
  })

  it('returns 0 for zero wpm', () => {
    expect(computeOverallScore(0, 80)).toBe(0)
  })

  it('returns 0 for zero quizScore', () => {
    expect(computeOverallScore(200, 0)).toBe(0)
  })

  it('returns 0 for quizScore at chance level (25%)', () => {
    expect(computeOverallScore(200, 25)).toBe(0)
  })

  it('returns 0 for quizScore below chance level', () => {
    expect(computeOverallScore(200, 20)).toBe(0)
  })

  it('returns positive score for quizScore just above chance level (26%)', () => {
    const score = computeOverallScore(200, 26)
    expect(score).toBeGreaterThan(0)
  })

  it('returns positive score for quizScore above chance level', () => {
    const score = computeOverallScore(200, 30)
    expect(score).toBeGreaterThan(0)
  })

  it('returns correct value for 100% quiz at 200 WPM', () => {
    // rawAccuracy = 100/100 = 1
    // adjustedAccuracy = (1 - 0.25) / (1 - 0.25) = 1
    // comprehension = 1^1.5 = 1
    // speed = 200^0.7
    // result = round(200^0.7 * 1 * 10)
    const expected = Math.round(Math.pow(200, 0.7) * 1 * 10)
    expect(computeOverallScore(200, 100)).toBe(expected)
  })

  it('higher quiz score at same WPM produces higher overall score', () => {
    const scoreLow = computeOverallScore(300, 40)
    const scoreHigh = computeOverallScore(300, 80)
    expect(scoreHigh).toBeGreaterThan(scoreLow)
  })

  it('higher WPM at same quiz score produces higher overall score', () => {
    const scoreSlow = computeOverallScore(100, 80)
    const scoreFast = computeOverallScore(400, 80)
    expect(scoreFast).toBeGreaterThan(scoreSlow)
  })

  it('produces integer output', () => {
    const score = computeOverallScore(250, 75)
    expect(Number.isInteger(score)).toBe(true)
  })

  it('exports constants matching expected values', () => {
    expect(CHANCE_RATE).toBe(0.25)
    expect(COMPREHENSION_EXPONENT).toBe(1.5)
    expect(SPEED_EXPONENT).toBe(0.7)
    expect(SCORE_SCALE).toBe(10)
  })
})
