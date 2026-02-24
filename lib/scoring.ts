import { MAX_QUIZ_SCORE, NUM_OPTIONS_PER_QUESTION } from './quizConstants'

/**
 * If you change these, also update the inline copy in
 * backend/supabase/functions/leaderboard/index.ts.
 */
export const CHANCE_RATE = 1 / NUM_OPTIONS_PER_QUESTION
export const COMPREHENSION_EXPONENT = 1.5
export const SPEED_EXPONENT = 0.7
export const SCORE_SCALE = 10

/**
 * Compute the leaderboard overall score from raw WPM and quiz percentage.
 *
 * Formula: round(wpm^0.7 * adjustedAccuracy^1.5 * 10)
 *
 * 1. Chance-correct the quiz score: scores at or below random-guessing level
 *    (25% for 4-option questions) map to 0.
 * 2. Raise adjusted accuracy to 1.5 so comprehension matters more than speed.
 * 3. Raise WPM to 0.7 for diminishing returns on raw reading speed.
 */
export function computeOverallScore(wpm: number, quizScore: number): number {
  if (!Number.isFinite(wpm) || !Number.isFinite(quizScore)) return 0
  if (wpm <= 0 || quizScore <= 0) return 0

  const rawAccuracy = quizScore / MAX_QUIZ_SCORE
  const adjustedAccuracy = Math.max(
    0,
    (rawAccuracy - CHANCE_RATE) / (1 - CHANCE_RATE)
  )

  if (adjustedAccuracy <= 0) return 0

  const comprehensionFactor = Math.pow(adjustedAccuracy, COMPREHENSION_EXPONENT)
  const speedFactor = Math.pow(wpm, SPEED_EXPONENT)

  return Math.round(speedFactor * comprehensionFactor * SCORE_SCALE)
}
