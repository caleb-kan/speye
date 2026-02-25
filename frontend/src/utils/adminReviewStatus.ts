import type { AdminReviewText } from '../services/adminService'
import { ADMIN_BADGE_CLASSES } from '../constants/admin'

export type AdminReviewStatus =
  | 'awaiting_review'
  | 'tos_violation'
  | 'quiz_quality_issue'
  | 'processing_failed'
  | 'quiz_validation_error'
  | 'still_validating'
  | 'still_processing'

export type ReviewStatusInfo = {
  status: AdminReviewStatus
  label: string
  badgeClass: string
  description: string
  isFailure: boolean
  canApprove: boolean
  canReject: boolean
  canDelete: boolean
  canRegenerate: boolean
  approveLabel: string
  regenerateLabel: string
}

// Exhaustive mapping ensures every status is explicitly categorized.
// Adding a new AdminReviewStatus without mapping it here causes a
// compile error, preventing silent miscategorization.
const STATUS_IS_FLAGGED: Record<AdminReviewStatus, boolean> = {
  tos_violation: true,
  quiz_quality_issue: true,
  processing_failed: true,
  quiz_validation_error: true,
  awaiting_review: false,
  still_validating: false,
  still_processing: false,
}

export function isFlaggedForReview(text: AdminReviewText): boolean {
  const { status } = getReviewStatus(text)
  return STATUS_IS_FLAGGED[status]
}

export function getReviewStatus(text: AdminReviewText): ReviewStatusInfo {
  // TOS violation: admin can only delete (text is hidden from user's library)
  if (text.rejection_stage === 'process_text' && text.llm_violation_type) {
    return {
      status: 'tos_violation',
      label: 'TOS Violation',
      badgeClass: ADMIN_BADGE_CLASSES.error,
      description:
        "This text was rejected for a content policy violation and is hidden from the user's library. Delete it to permanently remove it.",
      isFailure: true,
      canApprove: false,
      canReject: false,
      canDelete: true,
      canRegenerate: false,
      approveLabel: '',
      regenerateLabel: '',
    }
  }

  if (text.rejection_stage === 'validate_quiz') {
    return {
      status: 'quiz_quality_issue',
      label: 'Quiz Quality Issue',
      badgeClass: ADMIN_BADGE_CLASSES.warning,
      description:
        'The generated quiz failed quality validation. You can approve the quiz as-is, regenerate it, or reject the text.',
      isFailure: true,
      canApprove: true,
      canReject: true,
      canDelete: false,
      canRegenerate: true,
      approveLabel: 'Approve Quiz',
      regenerateLabel: 'Regenerate Quiz',
    }
  }

  if (text.processing_status === 'pending') {
    return {
      status: 'still_processing',
      label: 'Processing...',
      badgeClass: ADMIN_BADGE_CLASSES.muted,
      description:
        'This text is still being processed by the LLM. Refresh the page to check for updates.',
      isFailure: false,
      canApprove: false,
      canReject: false,
      canDelete: false,
      canRegenerate: false,
      approveLabel: '',
      regenerateLabel: '',
    }
  }

  if (text.processing_status === 'failed') {
    return {
      status: 'processing_failed',
      label: 'Processing Failed',
      badgeClass: ADMIN_BADGE_CLASSES.warning,
      description:
        'Text processing failed before completion. You can reprocess the text or reject it.',
      isFailure: true,
      canApprove: false,
      canReject: true,
      canDelete: false,
      canRegenerate: true,
      approveLabel: '',
      regenerateLabel: 'Reprocess Text',
    }
  }

  if (text.processing_status === 'completed' && text.quiz_valid === false) {
    return {
      status: 'quiz_validation_error',
      label: 'Quiz Validation Error',
      badgeClass: ADMIN_BADGE_CLASSES.warning,
      description:
        'The quiz validation service encountered an error. You can reprocess the text or reject it.',
      isFailure: true,
      canApprove: false,
      canReject: true,
      canDelete: false,
      canRegenerate: true,
      approveLabel: '',
      regenerateLabel: 'Reprocess Text',
    }
  }

  if (text.processing_status === 'completed' && text.quiz_valid === null) {
    return {
      status: 'still_validating',
      label: 'Validating Quiz...',
      badgeClass: ADMIN_BADGE_CLASSES.muted,
      description:
        'The quiz is still being validated. Refresh the page to check for updates.',
      isFailure: false,
      canApprove: false,
      canReject: false,
      canDelete: false,
      canRegenerate: false,
      approveLabel: '',
      regenerateLabel: '',
    }
  }

  return {
    status: 'awaiting_review',
    label: 'Awaiting Review',
    badgeClass: ADMIN_BADGE_CLASSES.info,
    description:
      'This text has been processed successfully and is ready for admin review.',
    isFailure: false,
    canApprove: true,
    canReject: true,
    canDelete: false,
    canRegenerate: false,
    approveLabel: 'Approve',
    regenerateLabel: '',
  }
}
