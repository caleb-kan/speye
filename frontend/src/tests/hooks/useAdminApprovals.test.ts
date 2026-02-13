import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminApprovals } from '../../hooks/useAdminApprovals'
import { createMockAdminText } from '../helpers/adminMockFactory'

let mockUser: { id: string; user_metadata: { role: string } } | null = {
  id: 'admin-1',
  user_metadata: { role: 'admin' },
}
let mockIsAdmin = true

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}))

vi.mock('../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockIsAdmin,
}))

const mockFetchPendingApprovals = vi.fn()
const mockApproveText = vi.fn()
const mockRejectText = vi.fn()
const mockRegenerateQuiz = vi.fn()
const mockRetryTextProcessing = vi.fn()

vi.mock('../../services/adminService', () => ({
  fetchPendingApprovals: (...args: unknown[]) =>
    mockFetchPendingApprovals(...args),
  approveText: (...args: unknown[]) => mockApproveText(...args),
  rejectText: (...args: unknown[]) => mockRejectText(...args),
  regenerateQuiz: (...args: unknown[]) => mockRegenerateQuiz(...args),
  retryTextProcessing: (...args: unknown[]) => mockRetryTextProcessing(...args),
}))

const mockCreateNotification = vi.fn()

vi.mock('../../services/notificationService', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}))

describe('useAdminApprovals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'admin-1', user_metadata: { role: 'admin' } }
    mockIsAdmin = true
    mockFetchPendingApprovals.mockResolvedValue([createMockAdminText()])
    mockApproveText.mockResolvedValue(undefined)
    mockRejectText.mockResolvedValue(undefined)
    mockRegenerateQuiz.mockResolvedValue(undefined)
    mockRetryTextProcessing.mockResolvedValue(undefined)
    mockCreateNotification.mockResolvedValue(undefined)
  })

  it('should fetch pending approvals on mount', async () => {
    const { result } = renderHook(() => useAdminApprovals())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockFetchPendingApprovals).toHaveBeenCalledOnce()
    expect(result.current.approvals).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('should not fetch approvals when isAdmin is false', async () => {
    mockIsAdmin = false

    const { result } = renderHook(() => useAdminApprovals())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockFetchPendingApprovals).not.toHaveBeenCalled()
    expect(result.current.approvals).toHaveLength(0)
    expect(result.current.isAdmin).toBe(false)
  })

  it('should set error when fetch fails', async () => {
    mockFetchPendingApprovals.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAdminApprovals())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.approvals).toHaveLength(0)
  })

  describe('handleApprove', () => {
    it('should approve text and remove from list', async () => {
      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleApprove('text-1')
      })

      expect(mockApproveText).toHaveBeenCalledWith('text-1', 'admin-1')
      expect(result.current.approvals).toHaveLength(0)
      expect(result.current.successMessage).toBe('Text approved successfully')
    })

    it('should trigger reprocessing for failed texts', async () => {
      mockFetchPendingApprovals.mockResolvedValue([
        createMockAdminText({ processing_status: 'failed' }),
      ])

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleApprove('text-1')
      })

      expect(mockRetryTextProcessing).toHaveBeenCalledWith('text-1')
      expect(result.current.successMessage).toBe(
        'Text approved and queued for reprocessing'
      )
    })

    it('should handle reprocessing failure gracefully', async () => {
      mockFetchPendingApprovals.mockResolvedValue([
        createMockAdminText({ processing_status: 'failed' }),
      ])
      mockRetryTextProcessing.mockRejectedValue(new Error('Queue error'))

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleApprove('text-1')
      })

      expect(result.current.successMessage).toContain('Text approved')
      expect(result.current.successMessage).toContain('reprocessing failed')
      // Approval still succeeded, text removed from list
      expect(result.current.approvals).toHaveLength(0)
    })

    it('should send notification to text owner', async () => {
      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleApprove('text-1')
      })

      expect(mockCreateNotification).toHaveBeenCalledWith(
        'user-1',
        'Your text "Test Text" has been approved',
        'info',
        '/library'
      )
    })

    it('should not send notification when text has no owner', async () => {
      mockFetchPendingApprovals.mockResolvedValue([
        createMockAdminText({ owner_id: null }),
      ])

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleApprove('text-1')
      })

      expect(mockCreateNotification).not.toHaveBeenCalled()
    })

    it('should reset selectedText after successful approve', async () => {
      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setSelectedText(createMockAdminText())
      })

      expect(result.current.selectedText).not.toBeNull()

      await act(async () => {
        await result.current.handleApprove('text-1')
      })

      expect(result.current.selectedText).toBeNull()
    })

    it('should no-op when user is null', async () => {
      mockUser = null

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleApprove('text-1')
      })

      expect(mockApproveText).not.toHaveBeenCalled()
    })

    it('should set error when approve fails', async () => {
      mockApproveText.mockRejectedValue(new Error('RPC failed'))

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleApprove('text-1')
      })

      expect(result.current.error).toBe('RPC failed')
      // Text should NOT be removed on failure
      expect(result.current.approvals).toHaveLength(1)
    })
  })

  describe('handleReject', () => {
    it('should reject text and remove from list', async () => {
      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleReject('text-1', 'Inappropriate content')
      })

      expect(mockRejectText).toHaveBeenCalledWith(
        'text-1',
        'admin-1',
        'Inappropriate content'
      )
      expect(result.current.approvals).toHaveLength(0)
      expect(result.current.successMessage).toBe(
        'Text rejected, deleted, and owner notified'
      )
    })

    it('should reject without notes', async () => {
      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleReject('text-1')
      })

      expect(mockRejectText).toHaveBeenCalledWith(
        'text-1',
        'admin-1',
        undefined
      )
    })

    it('should reset selectedText after successful reject', async () => {
      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setSelectedText(createMockAdminText())
      })

      await act(async () => {
        await result.current.handleReject('text-1', 'Bad content')
      })

      expect(result.current.selectedText).toBeNull()
    })

    it('should no-op when user is null', async () => {
      mockUser = null

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleReject('text-1')
      })

      expect(mockRejectText).not.toHaveBeenCalled()
    })

    it('should set error when reject fails', async () => {
      mockRejectText.mockRejectedValue(new Error('Reject failed'))

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleReject('text-1')
      })

      expect(result.current.error).toBe('Reject failed')
      expect(result.current.approvals).toHaveLength(1)
    })
  })

  describe('handleRegenerate', () => {
    it('should use retryTextProcessing for failed texts', async () => {
      mockFetchPendingApprovals.mockResolvedValue([
        createMockAdminText({ processing_status: 'failed' }),
      ])

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleRegenerate('text-1')
      })

      expect(mockRetryTextProcessing).toHaveBeenCalledWith('text-1')
      expect(mockRegenerateQuiz).not.toHaveBeenCalled()
      expect(result.current.successMessage).toBe('Text reprocessing queued')
    })

    it('should use regenerateQuiz for non-failed texts', async () => {
      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleRegenerate('text-1')
      })

      expect(mockRegenerateQuiz).toHaveBeenCalledWith('text-1', 'admin-1')
      expect(mockRetryTextProcessing).not.toHaveBeenCalled()
      expect(result.current.successMessage).toBe('Text reprocessing queued')
      expect(result.current.approvals).toHaveLength(0)
    })

    it('should reset selectedText after successful regenerate', async () => {
      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setSelectedText(createMockAdminText())
      })

      await act(async () => {
        await result.current.handleRegenerate('text-1')
      })

      expect(result.current.selectedText).toBeNull()
    })

    it('should no-op when user is null', async () => {
      mockUser = null

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleRegenerate('text-1')
      })

      expect(mockRegenerateQuiz).not.toHaveBeenCalled()
      expect(mockRetryTextProcessing).not.toHaveBeenCalled()
    })

    it('should set correct error for failed reprocessing', async () => {
      mockFetchPendingApprovals.mockResolvedValue([
        createMockAdminText({ processing_status: 'failed' }),
      ])
      mockRetryTextProcessing.mockRejectedValue(new Error('Queue full'))

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleRegenerate('text-1')
      })

      expect(result.current.error).toBe('Queue full')
    })

    it('should set correct error for failed quiz regeneration', async () => {
      mockRegenerateQuiz.mockRejectedValue(new Error('Quiz gen error'))

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.handleRegenerate('text-1')
      })

      expect(result.current.error).toBe('Quiz gen error')
    })
  })

  describe('processing state', () => {
    it('should set processing during approve', async () => {
      let resolveApprove: () => void
      mockApproveText.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveApprove = resolve
          })
      )

      const { result } = renderHook(() => useAdminApprovals())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.handleApprove('text-1')
      })

      await waitFor(() => {
        expect(result.current.processing).toBe('text-1')
      })

      await act(async () => {
        resolveApprove!()
      })

      expect(result.current.processing).toBeNull()
    })
  })
})
