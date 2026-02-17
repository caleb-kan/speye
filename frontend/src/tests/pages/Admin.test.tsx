import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Admin } from '../../pages/Admin'
import type { AdminReviewText } from '../../services/adminService'
import { createMockAdminText } from '../helpers/adminMockFactory'

let mockAuthLoading = false
let mockIsAdmin = true
let mockApprovals: AdminReviewText[] = []
let mockLoading = false
let mockError: string | null = null
let mockSuccessMessage: string | null = null

const mockHandlers = {
  setSelectedText: vi.fn(),
  setQuizPreviewText: vi.fn(),
  setSuccessMessage: vi.fn(),
  handleApprove: vi.fn(),
  handleReject: vi.fn(),
  handleRegenerate: vi.fn(),
}

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ loading: mockAuthLoading }),
}))

vi.mock('../../hooks/useAdminApprovals', () => ({
  useAdminApprovals: () => ({
    approvals: mockApprovals,
    loading: mockLoading,
    error: mockError,
    successMessage: mockSuccessMessage,
    processing: null,
    selectedText: null,
    quizPreviewText: null,
    isAdmin: mockIsAdmin,
    ...mockHandlers,
  }),
}))

vi.mock('../../hooks/useAutoClearMessage', () => ({
  useAutoClearMessage: vi.fn(),
}))

describe('Admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthLoading = false
    mockIsAdmin = true
    mockApprovals = [createMockAdminText()]
    mockLoading = false
    mockError = null
    mockSuccessMessage = null
  })

  it('should show loading state when auth is loading', () => {
    mockAuthLoading = true
    mockLoading = true
    render(<Admin />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should show loading state when approvals are loading', () => {
    mockLoading = true
    render(<Admin />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should show access denied for non-admins', () => {
    mockIsAdmin = false
    render(<Admin />)

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should render admin panel header', () => {
    render(<Admin />)

    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Manage text approvals, send notifications, and manage admins'
      )
    ).toBeInTheDocument()
  })

  it('should render all admin sections', () => {
    render(<Admin />)

    expect(
      screen.getByRole('heading', { name: 'Text Approvals' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Send Notification' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Manage Admins' })
    ).toBeInTheDocument()
  })

  it('should render approval items', () => {
    render(<Admin />)

    expect(screen.getByText('Test Text')).toBeInTheDocument()
  })

  it('should show empty state when no approvals', () => {
    mockApprovals = []
    render(<Admin />)

    expect(screen.getByText('All caught up!')).toBeInTheDocument()
    expect(
      screen.getByText('No texts are currently pending review.')
    ).toBeInTheDocument()
  })

  it('should show success message', () => {
    mockSuccessMessage = 'Text approved successfully'
    render(<Admin />)

    expect(screen.getByText('Text approved successfully')).toBeInTheDocument()
  })

  it('should show error message', () => {
    mockError = 'Failed to fetch approvals'
    render(<Admin />)

    expect(screen.getByText('Failed to fetch approvals')).toBeInTheDocument()
  })

  it('should not show content when there is an error', () => {
    mockError = 'Something went wrong'
    render(<Admin />)

    // Content should be hidden on error
    expect(screen.queryByText('Test Text')).not.toBeInTheDocument()
  })

  it('should open text preview on reject from card', async () => {
    const user = userEvent.setup()
    render(<Admin />)

    await user.click(screen.getByLabelText('Reject'))

    // Should call setSelectedText with the text object
    expect(mockHandlers.setSelectedText).toHaveBeenCalledWith(
      createMockAdminText()
    )
  })

  it('should open text preview on view', async () => {
    const user = userEvent.setup()
    render(<Admin />)

    await user.click(screen.getByLabelText('View full text'))

    expect(mockHandlers.setSelectedText).toHaveBeenCalledWith(
      createMockAdminText()
    )
  })
})
