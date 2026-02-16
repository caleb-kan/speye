import {
  NUM_QUESTION_SETS,
  NUM_QUESTIONS,
  NUM_OPTIONS_PER_QUESTION,
} from '../../../lib/quizConstants'

export { NUM_QUESTION_SETS, NUM_QUESTIONS, NUM_OPTIONS_PER_QUESTION }

// QuizOverlay
export const MODAL_Z_INDEX = 999

// QuizResults
export const SCORE_ANIMATION_DURATION_MS = 3000
// Brief delay before fetching leaderboard to allow cache propagation after save
export const LEADERBOARD_FETCH_DELAY_MS = 500
export const FULL_SCREEN_SCORE_SIZE = 260
export const PRIVATE_SCORE_SIZE = 220
export const PUBLIC_SCORE_SIZE = 100
export const OPTION_LABELS = Array.from(
  { length: NUM_OPTIONS_PER_QUESTION },
  (_, i) => String.fromCharCode(65 + i)
)
export const MAX_QUIZ_SCORE = 100
export const LEADERBOARD_TOP_COUNT = 5

// CircularProgress
export const SMALL_CIRCLE_THRESHOLD = 120
export const DEFAULT_CIRCLE_SIZE = 200
export const DEFAULT_STROKE_WIDTH = 12
export const CIRCLE_ANIMATION_DELAY_MS = 100
