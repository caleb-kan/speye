/**
 * Shared quiz structure constants used by both frontend and backend validation.
 *
 * Frontend: frontend/src/constants/quiz.ts re-exports these alongside UI constants.
 * Backend: backend/supabase/database/texts/updateTextQuiz.ts uses these for
 *          server-side validation (assertValidQuiz).
 *
 * Deno Edge Functions (process-text, validate-quiz) cannot import from lib/
 * and duplicate these values inline. Keep all copies in sync.
 */
export const MIN_QUESTION_SETS = 1
export const MAX_QUESTION_SETS = 5
export const MIN_QUESTIONS = 5
export const MAX_QUESTIONS = 7
export const NUM_OPTIONS_PER_QUESTION = 4
export const MAX_QUIZ_SCORE = 100

// Sectional texts have one question set per section with fewer questions each.
// Duplicated in backend/supabase/functions/process-text/index.ts (Deno).
export const MIN_QUESTIONS_SECTIONAL = 3
export const MAX_QUESTIONS_SECTIONAL = 7
