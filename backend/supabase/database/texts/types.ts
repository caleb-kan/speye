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
 * Processing status for queue-based LLM processing
 */
export type ProcessingStatus = 'pending' | 'completed' | 'failed'

/**
 * Input data for creating or updating a text.
 * Used by both uploadText and updateText functions.
 */
export interface TextInput {
  title?: string | null
  content: string
  fiction?: boolean | null
  quiz?: Quiz | null
  processing_status?: ProcessingStatus
  quiz_valid?: boolean | null
  isPublic?: boolean
  summary?: string | null
}

/**
 * LLM decision on text content
 */
export type LlmDecision = 'approved' | 'rejected'

/**
 * Admin decision on text content
 */
export type AdminDecision = 'approved' | 'rejected' | 'pending'

/**
 * Pipeline stage where a failure or rejection originated
 */
export type FailureStage = 'process_text' | 'validate_quiz'

/**
 * Full text record as stored in the database.
 */
export interface TextRecord {
  id: string
  owner_id: string | null
  title: string | null
  content: string
  summary: string | null
  fiction: boolean | null
  uploaded_at: string
  quiz: Quiz | null
  complexity: number | null
  source: string | null
  processing_status: ProcessingStatus
  quiz_valid: boolean | null
  llm_decision: LlmDecision | null
  llm_violation_type: string | null
  admin_decision: AdminDecision | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null
  rejection_reason: string | null
  rejection_stage: FailureStage | null
}
