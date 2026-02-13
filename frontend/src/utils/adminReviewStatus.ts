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
  canRegenerate: boolean
  approveLabel: string
  regenerateLabel: string
}

export function getReviewStatus(text: AdminReviewText): ReviewStatusInfo {
  // TOS violation takes priority (rejection_stage is set by the worker)
  if (text.rejection_stage === 'process_text') {
    return {
      status: 'tos_violation',
      label: 'TOS Violation',
      badgeClass: ADMIN_BADGE_CLASSES.error,
      description:
        'This text was flagged for a content policy violation during processing. Approving will override the flag and reprocess the text.',
      isFailure: true,
      canApprove: true,
      canRegenerate: false,
      approveLabel: 'Approve & Process',
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
      canRegenerate: false,
      approveLabel: '',
      regenerateLabel: '',
    }
  }

  if (text.processing_status === 'failed') {
    return {
      status: 'processing_failed',
      label: 'Processing Failed',
      badgeClass: ADMIN_BADGE_CLASSES.orange,
      description:
        'Text processing failed before completion. You can reprocess the text or reject it.',
      isFailure: true,
      canApprove: false,
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
    canRegenerate: false,
    approveLabel: 'Approve',
    regenerateLabel: '',
  }
}
