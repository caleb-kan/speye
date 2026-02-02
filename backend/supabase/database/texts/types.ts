/**
 * Quiz question structure
 */
export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

/**
 * Question set structure (5 questions per set)
 */
export interface QuestionSet {
  questions: QuizQuestion[]
}

/**
 * Quiz structure (5 sets of 5 questions = 25 questions total)
 */
export interface Quiz {
  questionSets: QuestionSet[]
}

/**
 * Input data for creating or updating a text.
 * Used by both uploadText and updateText functions.
 */
export interface TextInput {
  title: string | null
  content: string
  fiction: boolean
  quiz?: Quiz | null
}

/**
 * Full text record as stored in the database.
 */
export interface TextRecord {
  id: string
  owner_id: string | null
  title: string | null
  content: string
  fiction: boolean
  uploaded_at: string
  quiz: Quiz | null
  category: string | null
  complexity: number | null
  source: string | null
}
