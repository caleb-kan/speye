/**
 * Shared quiz structure constants used by both frontend and backend validation.
 *
 * Frontend: frontend/src/constants/quiz.ts re-exports these alongside UI constants.
 * Backend: backend/supabase/database/texts/updateTextQuiz.ts uses these for
 *          server-side validation (assertValidQuiz).
 */
export const MIN_QUESTION_SETS = 1
export const MAX_QUESTION_SETS = 5
export const MIN_QUESTIONS = 5
export const MAX_QUESTIONS = 7
export const NUM_OPTIONS_PER_QUESTION = 4
export const MAX_QUIZ_SCORE = 100
