import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdminReviewText } from '../../services/adminService'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()

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

const mockApprovals: AdminReviewText[] = [
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
  },
]

describe('adminService (frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
  })

  describe('fetchPendingApprovals', () => {
    it('should fetch pending approvals', async () => {
      mockOrder.mockResolvedValue({
        data: mockApprovals,
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
  })
})
