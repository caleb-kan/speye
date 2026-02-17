import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Admin } from '../../pages/Admin'
import { createMockAdminText } from '../helpers/adminMockFactory'
import type { AdminReviewText } from '../../services/adminService'

type AdminPageMockState = {
  authLoading: boolean
  isAdmin: boolean
  approvals: AdminReviewText[]
  loading: boolean
  error: string | null
  successMessage: string | null
}

const { mockHandlers, mockState } = vi.hoisted(() => {
  const mockHandlers = {
    setSelectedText: vi.fn(),
    setQuizPreviewText: vi.fn(),
    setSuccessMessage: vi.fn(),
    handleApprove: vi.fn(),
    handleReject: vi.fn(),
    handleRegenerate: vi.fn(),
  }

  const mockState: AdminPageMockState = {
    authLoading: false,
    isAdmin: true,
    approvals: [],
    loading: false,
    error: null,
    successMessage: null,
  }

  return { mockHandlers, mockState }
})

vi.mock('../../hooks/useAdminStats', () => ({
  useAdminStats: () => ({
    stats: {
      totalTexts: 100,
      publicTexts: 80,
      privateTexts: 20,
      pendingTexts: 5,
      activeUsers: 10,
      rejectionRate: '5%',
    },
    trend: [],
    loading: false,
    error: null,
  }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ loading: mockState.authLoading }),
}))

vi.mock('../../hooks/useAdminApprovals', () => ({
  useAdminApprovals: () => ({
    approvals: mockState.approvals,
    loading: mockState.loading,
    error: mockState.error,
    successMessage: mockState.successMessage,
    processing: null,
    selectedText: null,
    quizPreviewText: null,
    isAdmin: mockState.isAdmin,
    ...mockHandlers,
  }),
}))

vi.mock('../../hooks/useAutoClearMessage', () => ({
  useAutoClearMessage: vi.fn(),
}))

vi.mock('../../components/admin/AdminGraphCard', () => ({
  AdminGraphCard: () => <div data-testid="admin-graph">Graph</div>,
}))
vi.mock('../../components/admin/AdminActionPanel', () => ({
  AdminActionPanel: () => (
    <div data-testid="admin-action-panel">Action Panel</div>
  ),
}))

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Admin', () => {
  const mockText = createMockAdminText({ id: 'text-123', title: 'Test Text' })

  beforeEach(() => {
    vi.clearAllMocks()
    mockState.authLoading = false
    mockState.isAdmin = true
    mockState.approvals = [mockText]
    mockState.loading = false
    mockState.error = null
    mockState.successMessage = null
  })

  it('should show loading state when auth is loading', () => {
    mockState.authLoading = true
    render(<Admin />)
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('should show loading state when approvals are loading', () => {
    mockState.loading = true
    render(<Admin />)
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('should show access denied for non-admins', () => {
    mockState.isAdmin = false
    render(<Admin />)
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
  })

  it('should render admin panel header', () => {
    render(<Admin />)
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    expect(
      screen.getByText('Overview of content moderation and system activity')
    ).toBeInTheDocument()
  })

  it('should render main dashboard sections', () => {
    render(<Admin />)
    expect(screen.getByText('Pending Reviews')).toBeInTheDocument()
    expect(screen.getByTestId('admin-action-panel')).toBeInTheDocument()
    expect(screen.getByText('Total Texts')).toBeInTheDocument()
    expect(screen.getByText('Rejection Rate')).toBeInTheDocument()
  })

  it('should render approval items', () => {
    render(<Admin />)
    expect(screen.getByText('Test Text')).toBeInTheDocument()
  })

  it('should show empty state when no approvals', () => {
    mockState.approvals = []
    render(<Admin />)
    expect(screen.getByText('All caught up!')).toBeInTheDocument()
    expect(
      screen.getByText('No texts are currently pending review.')
    ).toBeInTheDocument()
  })

  it('should show success message', () => {
    mockState.successMessage = 'Text approved successfully'
    render(<Admin />)
    expect(screen.getByText('Text approved successfully')).toBeInTheDocument()
  })

  it('should show error message', () => {
    mockState.error = 'Failed to fetch approvals'
    render(<Admin />)
    expect(screen.getByText('Failed to fetch approvals')).toBeInTheDocument()
  })

  it('should open text preview on reject from card', async () => {
    const user = userEvent.setup()
    render(<Admin />)

    await user.click(screen.getByTitle('Reject'))

    expect(mockHandlers.setSelectedText).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'text-123' })
    )
  })

  it('should open text preview on view', async () => {
    const user = userEvent.setup()
    render(<Admin />)

    await user.click(screen.getByTitle('View details'))

    expect(mockHandlers.setSelectedText).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'text-123' })
    )
  })
})
