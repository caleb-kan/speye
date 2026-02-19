import { describe, it, expect } from 'vitest'
import {
  getReviewStatus,
  isFlaggedForReview,
  type AdminReviewStatus,
} from '../../utils/adminReviewStatus'
import { ADMIN_BADGE_CLASSES } from '../../constants/admin'
import type { AdminReviewText } from '../../services/adminService'
import { createMockAdminText } from '../helpers/adminMockFactory'

describe('getReviewStatus', () => {
  it('should return tos_violation when rejection_stage is process_text', () => {
    const text = createMockAdminText({
      rejection_stage: 'process_text',
      processing_status: 'failed',
      llm_decision: 'rejected',
      llm_violation_type: 'hate_speech',
    })
    const result = getReviewStatus(text)

    expect(result.status).toBe<AdminReviewStatus>('tos_violation')
    expect(result.label).toBe('TOS Violation')
    expect(result.badgeClass).toBe(ADMIN_BADGE_CLASSES.error)
    expect(result.isFailure).toBe(true)
    expect(result.canApprove).toBe(true)
    expect(result.canRegenerate).toBe(false)
    expect(result.approveLabel).toBe('Approve & Process')
  })

  it('should return quiz_quality_issue when rejection_stage is validate_quiz', () => {
    const text = createMockAdminText({
      rejection_stage: 'validate_quiz',
      processing_status: 'completed',
      quiz_valid: false,
    })
    const result = getReviewStatus(text)

    expect(result.status).toBe<AdminReviewStatus>('quiz_quality_issue')
    expect(result.label).toBe('Quiz Quality Issue')
    expect(result.badgeClass).toBe(ADMIN_BADGE_CLASSES.warning)
    expect(result.isFailure).toBe(true)
    expect(result.canApprove).toBe(true)
    expect(result.canRegenerate).toBe(true)
    expect(result.approveLabel).toBe('Approve Quiz')
    expect(result.regenerateLabel).toBe('Regenerate Quiz')
  })

  it('should return still_processing when processing_status is pending', () => {
    const text = createMockAdminText({ processing_status: 'pending' })
    const result = getReviewStatus(text)

    expect(result.status).toBe<AdminReviewStatus>('still_processing')
    expect(result.label).toBe('Processing...')
    expect(result.badgeClass).toBe(ADMIN_BADGE_CLASSES.muted)
    expect(result.isFailure).toBe(false)
    expect(result.canApprove).toBe(false)
    expect(result.canRegenerate).toBe(false)
  })

  it('should return processing_failed when processing_status is failed and no rejection_stage', () => {
    const text = createMockAdminText({
      processing_status: 'failed',
      rejection_stage: null,
    })
    const result = getReviewStatus(text)

    expect(result.status).toBe<AdminReviewStatus>('processing_failed')
    expect(result.label).toBe('Processing Failed')
    expect(result.badgeClass).toBe(ADMIN_BADGE_CLASSES.orange)
    expect(result.isFailure).toBe(true)
    expect(result.canApprove).toBe(false)
    expect(result.canRegenerate).toBe(true)
    expect(result.regenerateLabel).toBe('Reprocess Text')
  })

  it('should return quiz_validation_error when completed with quiz_valid false and no rejection_stage', () => {
    const text = createMockAdminText({
      processing_status: 'completed',
      quiz_valid: false,
      rejection_stage: null,
    })
    const result = getReviewStatus(text)

    expect(result.status).toBe<AdminReviewStatus>('quiz_validation_error')
    expect(result.label).toBe('Quiz Validation Error')
    expect(result.badgeClass).toBe(ADMIN_BADGE_CLASSES.warning)
    expect(result.isFailure).toBe(true)
    expect(result.canApprove).toBe(false)
    expect(result.canRegenerate).toBe(true)
    expect(result.regenerateLabel).toBe('Reprocess Text')
  })

  it('should return still_validating when completed with quiz_valid null', () => {
    const text = createMockAdminText({
      processing_status: 'completed',
      quiz_valid: null,
      rejection_stage: null,
    })
    const result = getReviewStatus(text)

    expect(result.status).toBe<AdminReviewStatus>('still_validating')
    expect(result.label).toBe('Validating Quiz...')
    expect(result.badgeClass).toBe(ADMIN_BADGE_CLASSES.muted)
    expect(result.isFailure).toBe(false)
    expect(result.canApprove).toBe(false)
    expect(result.canRegenerate).toBe(false)
  })

  it('should return awaiting_review when completed with valid quiz and no issues', () => {
    const text = createMockAdminText({
      processing_status: 'completed',
      quiz_valid: true,
      rejection_stage: null,
    })
    const result = getReviewStatus(text)

    expect(result.status).toBe<AdminReviewStatus>('awaiting_review')
    expect(result.label).toBe('Awaiting Review')
    expect(result.badgeClass).toBe(ADMIN_BADGE_CLASSES.info)
    expect(result.isFailure).toBe(false)
    expect(result.canApprove).toBe(true)
    expect(result.canRegenerate).toBe(false)
    expect(result.approveLabel).toBe('Approve')
  })

  it('should prioritize rejection_stage over processing_status', () => {
    // TOS violation takes priority even if processing_status is completed
    const text = createMockAdminText({
      rejection_stage: 'process_text',
      processing_status: 'completed',
    })
    const result = getReviewStatus(text)

    expect(result.status).toBe('tos_violation')
  })

  it('should prioritize validate_quiz rejection_stage over quiz_valid false', () => {
    const text = createMockAdminText({
      rejection_stage: 'validate_quiz',
      processing_status: 'completed',
      quiz_valid: false,
    })
    const result = getReviewStatus(text)

    expect(result.status).toBe('quiz_quality_issue')
    // Should NOT be quiz_validation_error
  })

  describe('isFlaggedForReview', () => {
    it('should return true for tos_violation', () => {
      const text = createMockAdminText({ rejection_stage: 'process_text' })
      expect(isFlaggedForReview(text)).toBe(true)
    })

    it('should return true for quiz_quality_issue', () => {
      const text = createMockAdminText({ rejection_stage: 'validate_quiz' })
      expect(isFlaggedForReview(text)).toBe(true)
    })

    it('should return true for processing_failed', () => {
      const text = createMockAdminText({
        processing_status: 'failed',
        rejection_stage: null,
      })
      expect(isFlaggedForReview(text)).toBe(true)
    })

    it('should return true for quiz_validation_error', () => {
      const text = createMockAdminText({
        processing_status: 'completed',
        quiz_valid: false,
        rejection_stage: null,
      })
      expect(isFlaggedForReview(text)).toBe(true)
    })

    it('should return false for awaiting_review', () => {
      const text = createMockAdminText({
        processing_status: 'completed',
        quiz_valid: true,
        rejection_stage: null,
      })
      expect(isFlaggedForReview(text)).toBe(false)
    })

    it('should return false for still_validating', () => {
      const text = createMockAdminText({
        processing_status: 'completed',
        quiz_valid: null,
        rejection_stage: null,
      })
      expect(isFlaggedForReview(text)).toBe(false)
    })

    it('should return false for still_processing', () => {
      const text = createMockAdminText({ processing_status: 'pending' })
      expect(isFlaggedForReview(text)).toBe(false)
    })
  })

  it('should include a non-empty description for every status', () => {
    const scenarios: Partial<AdminReviewText>[] = [
      { rejection_stage: 'process_text' },
      { rejection_stage: 'validate_quiz' },
      { processing_status: 'pending' },
      { processing_status: 'failed', rejection_stage: null },
      {
        processing_status: 'completed',
        quiz_valid: false,
        rejection_stage: null,
      },
      {
        processing_status: 'completed',
        quiz_valid: null,
        rejection_stage: null,
      },
      {
        processing_status: 'completed',
        quiz_valid: true,
        rejection_stage: null,
      },
    ]

    for (const overrides of scenarios) {
      const text = createMockAdminText(overrides)
      const result = getReviewStatus(text)
      expect(result.description.length).toBeGreaterThan(0)
      expect(result.label.length).toBeGreaterThan(0)
    }
  })
})
