import type { AdminReviewText } from '../../services/adminService'

export const createMockAdminText = (
  overrides: Partial<AdminReviewText> = {}
): AdminReviewText => ({
  id: 'text-1',
  title: 'Test Text',
  content: 'Some test content for the preview',
  uploaded_at: '2026-01-15T10:30:00Z',
  owner_id: 'user-1',
  processing_status: 'completed',
  quiz_valid: true,
  quiz: null,
  llm_decision: 'approved',
  llm_violation_type: null,
  admin_decision: 'pending',
  admin_reviewed_by: null,
  admin_reviewed_at: null,
  rejection_reason: null,
  rejection_stage: null,
  ...overrides,
})
