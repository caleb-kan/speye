/**
 * Shared quiz structure constants used by both frontend and backend validation.
 *
 * Frontend: frontend/src/constants/quiz.ts re-exports these alongside UI constants.
 * Backend: backend/supabase/database/texts/updateTextQuiz.ts uses these for
 *          server-side validation (assertValidQuiz).
 */
export const NUM_QUESTION_SETS = 5
export const NUM_QUESTIONS = 5
export const NUM_OPTIONS_PER_QUESTION = 4
export const MAX_QUIZ_SCORE = 100
