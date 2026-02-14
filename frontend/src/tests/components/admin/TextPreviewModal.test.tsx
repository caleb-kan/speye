import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextPreviewModal } from '../../../components/admin/textApproval/TextPreviewModal'
import { UNTITLED_TEXT_FALLBACK } from '../../../constants/admin'
import { createMockAdminText } from '../../helpers/adminMockFactory'

describe('TextPreviewModal', () => {
  const defaultHandlers = {
    onClose: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onRegenerate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render nothing when text is null', () => {
    const { container } = render(
      <TextPreviewModal text={null} processing={null} {...defaultHandlers} />
    )

    expect(container.innerHTML).toBe('')
  })

  it('should render text title and content', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    expect(screen.getByText('Test Text')).toBeInTheDocument()
    expect(
      screen.getByText('Some test content for the preview')
    ).toBeInTheDocument()
  })

  it('should render fallback title when null', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText({ title: null })}
        processing={null}
        {...defaultHandlers}
      />
    )

    expect(screen.getByText(UNTITLED_TEXT_FALLBACK)).toBeInTheDocument()
  })

  it('should show status badge', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    expect(screen.getByText('Awaiting Review')).toBeInTheDocument()
  })

  it('should show rejection reason when present', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText({ rejection_reason: 'Bad quiz' })}
        processing={null}
        {...defaultHandlers}
      />
    )

    expect(screen.getByText('Reason: Bad quiz')).toBeInTheDocument()
  })

  it('should show review status description', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    expect(
      screen.getByText(/processed successfully.*ready for admin review/i)
    ).toBeInTheDocument()
  })

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    await user.click(screen.getByLabelText('Close modal'))

    expect(defaultHandlers.onClose).toHaveBeenCalled()
  })

  it('should call onClose on Escape key', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    await user.keyboard('{Escape}')

    expect(defaultHandlers.onClose).toHaveBeenCalled()
  })

  it('should call onApprove when approve button clicked', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    await user.click(screen.getByText('Approve'))

    expect(defaultHandlers.onApprove).toHaveBeenCalledWith('text-1')
  })

  it('should show reject form when Reject button clicked', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    await user.click(screen.getByText('Reject'))

    expect(
      screen.getByLabelText('Rejection notes (optional)')
    ).toBeInTheDocument()
    expect(screen.getByText('Confirm Rejection')).toBeInTheDocument()
  })

  it('should pre-open reject form when initialShowReject is true', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        initialShowReject={true}
        {...defaultHandlers}
      />
    )

    expect(
      screen.getByLabelText('Rejection notes (optional)')
    ).toBeInTheDocument()
  })

  it('should call onReject with notes on confirm', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        initialShowReject={true}
        {...defaultHandlers}
      />
    )

    await user.type(
      screen.getByPlaceholderText('Provide a reason for rejection...'),
      'Bad content'
    )
    await user.click(screen.getByText('Confirm Rejection'))

    expect(defaultHandlers.onReject).toHaveBeenCalledWith(
      'text-1',
      'Bad content'
    )
  })

  it('should call onReject with undefined notes when empty', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        initialShowReject={true}
        {...defaultHandlers}
      />
    )

    await user.click(screen.getByText('Confirm Rejection'))

    expect(defaultHandlers.onReject).toHaveBeenCalledWith('text-1', undefined)
  })

  it('should hide reject form on cancel', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        initialShowReject={true}
        {...defaultHandlers}
      />
    )

    // Reject form Cancel (index 0), footer Cancel (index 1)
    const cancelButtons = screen.getAllByText('Cancel')
    await user.click(cancelButtons[0])

    expect(screen.queryByText('Confirm Rejection')).not.toBeInTheDocument()
  })

  it('should hide Reject button when reject form is shown', async () => {
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        initialShowReject={true}
        {...defaultHandlers}
      />
    )

    // The "Reject" button in the footer should be hidden when the form is open
    // Only "Confirm Rejection" should be present
    expect(screen.getByText('Confirm Rejection')).toBeInTheDocument()
    const rejectButtons = screen.queryAllByText('Reject')
    expect(rejectButtons).toHaveLength(0)
  })

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    const backdrop = screen.getByRole('dialog')
    await user.click(backdrop)

    expect(defaultHandlers.onClose).toHaveBeenCalled()
  })

  it('should not close when inner content is clicked', async () => {
    const user = userEvent.setup()
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    await user.click(screen.getByText('Some test content for the preview'))

    expect(defaultHandlers.onClose).not.toHaveBeenCalled()
  })

  it('should show regenerate button for quiz issues', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText({ rejection_stage: 'validate_quiz' })}
        processing={null}
        {...defaultHandlers}
      />
    )

    expect(screen.getByText('Regenerate Quiz')).toBeInTheDocument()
  })

  it('should disable buttons when processing', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing="text-1"
        {...defaultHandlers}
      />
    )

    expect(screen.getByText('Approve')).toBeDisabled()
  })

  it('should set aria-busy on action container when processing', () => {
    const { container } = render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing="text-1"
        {...defaultHandlers}
      />
    )

    const actionsDiv = container.querySelector('[aria-busy="true"]')
    expect(actionsDiv).toBeInTheDocument()
  })

  it('should have proper dialog role and aria attributes', () => {
    render(
      <TextPreviewModal
        text={createMockAdminText()}
        processing={null}
        {...defaultHandlers}
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'text-preview-title')
  })
})
