import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApprovalItem } from '../../../components/admin/textApproval/ApprovalItem'
import { UNTITLED_TEXT_FALLBACK } from '../../../constants/admin'
import { createMockAdminText } from '../../helpers/adminMockFactory'

describe('ApprovalItem', () => {
  const defaultHandlers = {
    onView: vi.fn(),
    onViewQuiz: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onRegenerate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render title and preview', () => {
    const text = createMockAdminText()
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.getByText('Test Text')).toBeInTheDocument()
    expect(screen.getByText(/Some test content/)).toBeInTheDocument()
  })

  it('should render fallback title when title is null', () => {
    const text = createMockAdminText({ title: null })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.getByText(UNTITLED_TEXT_FALLBACK)).toBeInTheDocument()
  })

  it('should show Awaiting Review badge for ready texts', () => {
    const text = createMockAdminText()
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.getByText('Awaiting Review')).toBeInTheDocument()
  })

  it('should show TOS Violation badge for process_text rejection', () => {
    const text = createMockAdminText({
      rejection_stage: 'process_text',
      rejection_reason: 'hate speech',
    })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.getByText('TOS Violation')).toBeInTheDocument()
    expect(screen.getByText('Reason: hate speech')).toBeInTheDocument()
  })

  it('should show approve button when canApprove is true', () => {
    const text = createMockAdminText()
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.getByTitle('Approve')).toBeInTheDocument()
  })

  it('should not show approve button when processing is still pending', () => {
    const text = createMockAdminText({ processing_status: 'pending' })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.queryByTitle('Approve')).not.toBeInTheDocument()
  })

  it('should show regenerate button for quiz issues', () => {
    const text = createMockAdminText({ rejection_stage: 'validate_quiz' })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.getByTitle('Regenerate')).toBeInTheDocument()
  })

  it('should show quiz view button when quiz exists', () => {
    const text = createMockAdminText({
      quiz: { questionSets: [] },
    })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.getByTitle('View quiz')).toBeInTheDocument()
  })

  it('should not show quiz view button when quiz is null', () => {
    const text = createMockAdminText({ quiz: null })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    expect(screen.queryByTitle('View quiz')).not.toBeInTheDocument()
  })

  it('should disable action buttons when processing this text', () => {
    const text = createMockAdminText()
    render(
      <ApprovalItem text={text} processing="text-1" {...defaultHandlers} />
    )

    expect(screen.getByTitle('Approve')).toBeDisabled()
    expect(screen.getByTitle('Reject')).toBeDisabled()
  })

  it('should not disable buttons when processing a different text', () => {
    const text = createMockAdminText()
    render(
      <ApprovalItem text={text} processing="other-text" {...defaultHandlers} />
    )

    expect(screen.getByTitle('Approve')).not.toBeDisabled()
    expect(screen.getByTitle('Reject')).not.toBeDisabled()
  })

  it('should call onView when eye button clicked', async () => {
    const user = userEvent.setup()
    const text = createMockAdminText()
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    await user.click(screen.getByTitle('View details'))

    expect(defaultHandlers.onView).toHaveBeenCalledWith(text)
  })

  it('should call onApprove with text id', async () => {
    const user = userEvent.setup()
    const text = createMockAdminText()
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    await user.click(screen.getByTitle('Approve'))

    expect(defaultHandlers.onApprove).toHaveBeenCalledWith('text-1')
  })

  it('should call onReject with text object', async () => {
    const user = userEvent.setup()
    const text = createMockAdminText()
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    await user.click(screen.getByTitle('Reject'))

    expect(defaultHandlers.onReject).toHaveBeenCalledWith(text)
  })

  it('should truncate long content in preview', () => {
    const longContent = 'A'.repeat(200)
    const text = createMockAdminText({ content: longContent })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    const preview = screen.getByText(/A+\.\.\./)
    expect(preview.textContent!.length).toBeLessThan(100)
  })

  it('should set aria-busy on action container when processing', () => {
    const text = createMockAdminText()
    const { container } = render(
      <ApprovalItem text={text} processing="text-1" {...defaultHandlers} />
    )

    const actionsDiv = container.querySelector('[aria-busy="true"]')
    expect(actionsDiv).toBeInTheDocument()
  })

  it('should call onViewQuiz with text object', async () => {
    const user = userEvent.setup()
    const text = createMockAdminText({ quiz: { questionSets: [] } })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    await user.click(screen.getByTitle('View quiz'))

    expect(defaultHandlers.onViewQuiz).toHaveBeenCalledWith(text)
  })

  it('should call onRegenerate with text id', async () => {
    const user = userEvent.setup()
    const text = createMockAdminText({ rejection_stage: 'validate_quiz' })
    render(<ApprovalItem text={text} processing={null} {...defaultHandlers} />)

    await user.click(screen.getByTitle('Regenerate'))

    expect(defaultHandlers.onRegenerate).toHaveBeenCalledWith('text-1')
  })
})
