// Shared types re-exported from backend canonical definitions
export type {
  QuizQuestion,
  QuestionSet,
  Quiz,
  ProcessingStatus,
  LlmDecision,
  AdminDecision,
  FailureStage,
} from '../../../backend/supabase/database/texts/types'

import type {
  Quiz,
  ProcessingStatus,
  LlmDecision,
  AdminDecision,
  FailureStage,
} from '../../../backend/supabase/database/texts/types'

export type TextInput = {
  title?: string | null
  content: string
  summary?: string | null
  fiction?: boolean | null
  quiz?: Quiz | null
  processing_status?: ProcessingStatus
  quiz_valid?: boolean | null
  isPublic?: boolean
}

export type Text = {
  id: string
  title: string | null
  content: string
  summary: string | null
  uploaded_at: string
  owner_id: string | null
  quiz: Quiz | null
  fiction: boolean | null
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

export type TextPreview = {
  id: string
  title: string | null
  preview: string
  uploaded_at: string
  owner_id: string | null
  quiz: Quiz | null
  fiction: boolean | null
  complexity: number | null
  source: string | null
  processing_status: ProcessingStatus
  quiz_valid: boolean | null
  has_summary: boolean
  llm_decision: LlmDecision | null
  llm_violation_type: string | null
  admin_decision: AdminDecision | null
  rejection_reason: string | null
  rejection_stage: FailureStage | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null
}

export type NotificationType = 'info' | 'alert' | 'error'

export type Notification = {
  id: string
  user_id: string
  message: string
  type: NotificationType
  seen: boolean
  toast_shown: boolean
  created_at: string
  link: string | null
}
