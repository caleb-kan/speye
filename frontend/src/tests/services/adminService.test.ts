import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdminReviewText } from '../../services/adminService'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOr = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return { select: mockSelect }
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('../../../../backend/supabase/database/logger', () => ({
  logDbQuery: vi.fn(),
}))

// Raw rows as returned by Supabase (includes joined users object)
const mockRawRows = [
  {
    id: 'text-1',
    title: 'Test',
    content: 'Content',
    uploaded_at: '2026-01-01T00:00:00Z',
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
    users: { username: 'testuser' },
  },
]

// Expected result after mapping (owner_username flattened, users removed)
const mockApprovals: AdminReviewText[] = [
  {
    id: 'text-1',
    title: 'Test',
    content: 'Content',
    uploaded_at: '2026-01-01T00:00:00Z',
    owner_id: 'user-1',
    owner_username: 'testuser',
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
  },
]

describe('adminService (frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ or: mockOr, order: mockOrder, single: mockSingle })
    mockOr.mockReturnValue({ order: mockOrder })
    mockSingle.mockResolvedValue({
      data: { llm_violation_type: null, rejection_stage: null },
      error: null,
    })
  })

  describe('fetchPendingApprovals', () => {
    it('should fetch pending approvals', async () => {
      mockOrder.mockResolvedValue({
        data: mockRawRows,
        error: null,
      })

      const { fetchPendingApprovals } =
        await import('../../services/adminService')
      const result = await fetchPendingApprovals()

      expect(result).toEqual(mockApprovals)
      expect(mockFrom).toHaveBeenCalledWith('texts')
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      })

      const { fetchPendingApprovals } =
        await import('../../services/adminService')

      await expect(fetchPendingApprovals()).rejects.toEqual({
        message: 'DB error',
      })
    })
  })

  describe('approveText', () => {
    it('should call admin_approve_text RPC', async () => {
      mockRpc.mockResolvedValue({ error: null })

      const { approveText } = await import('../../services/adminService')
      await approveText('text-1', 'admin-1')

      expect(mockRpc).toHaveBeenCalledWith('admin_approve_text', {
        p_text_id: 'text-1',
        p_admin_id: 'admin-1',
      })
    })

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValue({
        error: { message: 'Not authorized' },
      })

      const { approveText } = await import('../../services/adminService')

      await expect(approveText('text-1', 'admin-1')).rejects.toEqual({
        message: 'Not authorized',
      })
    })
  })

  describe('rejectText', () => {
    it('should call admin_reject_text RPC with notes', async () => {
      mockRpc.mockResolvedValue({ error: null })

      const { rejectText } = await import('../../services/adminService')
      await rejectText('text-1', 'admin-1', 'Bad content')

      expect(mockRpc).toHaveBeenCalledWith('admin_reject_text', {
        p_text_id: 'text-1',
        p_admin_id: 'admin-1',
        p_notes: 'Bad content',
      })
    })

    it('should pass null when no notes provided', async () => {
      mockRpc.mockResolvedValue({ error: null })

      const { rejectText } = await import('../../services/adminService')
      await rejectText('text-1', 'admin-1')

      expect(mockRpc).toHaveBeenCalledWith('admin_reject_text', {
        p_text_id: 'text-1',
        p_admin_id: 'admin-1',
        p_notes: null,
      })
    })
  })

  describe('regenerateQuiz', () => {
    it('should call admin_regenerate_quiz RPC', async () => {
      mockRpc.mockResolvedValue({ error: null })

      const { regenerateQuiz } = await import('../../services/adminService')
      await regenerateQuiz('text-1', 'admin-1')

      expect(mockRpc).toHaveBeenCalledWith('admin_regenerate_quiz', {
        p_text_id: 'text-1',
        p_admin_id: 'admin-1',
      })
    })

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValue({
        error: { message: 'Regeneration failed' },
      })

      const { regenerateQuiz } = await import('../../services/adminService')

      await expect(regenerateQuiz('text-1', 'admin-1')).rejects.toEqual({
        message: 'Regeneration failed',
      })
    })
  })

  describe('deleteTosViolation', () => {
    it('should call admin_delete_tos_violation RPC', async () => {
      mockRpc.mockResolvedValue({ error: null })

      const { deleteTosViolation } = await import('../../services/adminService')
      await deleteTosViolation('text-1', 'admin-1')

      expect(mockRpc).toHaveBeenCalledWith('admin_delete_tos_violation', {
        p_text_id: 'text-1',
        p_admin_id: 'admin-1',
      })
    })

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValue({
        error: { message: 'Delete failed' },
      })

      const { deleteTosViolation } = await import('../../services/adminService')

      await expect(deleteTosViolation('text-1', 'admin-1')).rejects.toEqual({
        message: 'Delete failed',
      })
    })
  })

  describe('retryTextProcessing', () => {
    it('should call retry_text_processing RPC', async () => {
      mockRpc.mockResolvedValue({ error: null })

      const { retryTextProcessing } =
        await import('../../services/adminService')
      await retryTextProcessing('text-1')

      expect(mockRpc).toHaveBeenCalledWith('retry_text_processing', {
        p_text_id: 'text-1',
      })
    })

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValue({
        error: { message: 'Retry failed' },
      })

      const { retryTextProcessing } =
        await import('../../services/adminService')

      await expect(retryTextProcessing('text-1')).rejects.toEqual({
        message: 'Retry failed',
      })
    })

    it('should throw when text has TOS violation', async () => {
      mockSingle.mockResolvedValue({
        data: {
          llm_violation_type: 'hate_speech',
          rejection_stage: 'process_text',
        },
        error: null,
      })

      const { retryTextProcessing } =
        await import('../../services/adminService')

      await expect(retryTextProcessing('text-1')).rejects.toThrow(
        'content policy violation'
      )
      expect(mockRpc).not.toHaveBeenCalledWith(
        'retry_text_processing',
        expect.anything()
      )
    })

    it('should allow retry when rejection_stage is process_text but no llm_violation_type', async () => {
      mockSingle.mockResolvedValue({
        data: {
          llm_violation_type: null,
          rejection_stage: 'process_text',
        },
        error: null,
      })
      mockRpc.mockResolvedValue({ error: null })

      const { retryTextProcessing } =
        await import('../../services/adminService')
      await retryTextProcessing('text-1')

      expect(mockRpc).toHaveBeenCalledWith('retry_text_processing', {
        p_text_id: 'text-1',
      })
    })
  })
})
