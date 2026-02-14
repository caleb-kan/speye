import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationForm } from '../../../components/admin/notificationCreator/NotificationForm'
import { PAGE_LINKS } from '../../../constants/admin'

describe('NotificationForm', () => {
  const defaultProps = {
    notificationType: 'info' as const,
    message: '',
    link: '',
    isBroadcast: false,
    sending: false,
    canSend: true,
    availableLinks: PAGE_LINKS,
    onTypeChange: vi.fn(),
    onMessageChange: vi.fn(),
    onLinkChange: vi.fn(),
    onSend: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all form fields', () => {
    render(<NotificationForm {...defaultProps} />)

    expect(screen.getByLabelText('Notification Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
    expect(screen.getByLabelText('Link')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).toBeInTheDocument()
  })

  it('should call onTypeChange when type is changed', async () => {
    const user = userEvent.setup()
    render(<NotificationForm {...defaultProps} />)

    await user.selectOptions(
      screen.getByLabelText('Notification Type'),
      'alert'
    )

    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('alert')
  })

  it('should call onMessageChange when message is typed', async () => {
    const user = userEvent.setup()
    render(<NotificationForm {...defaultProps} />)

    await user.type(screen.getByLabelText('Message'), 'Hello')

    expect(defaultProps.onMessageChange).toHaveBeenCalled()
  })

  it('should call onLinkChange when link is changed', async () => {
    const user = userEvent.setup()
    render(<NotificationForm {...defaultProps} />)

    await user.selectOptions(screen.getByLabelText('Link'), '/library')

    expect(defaultProps.onLinkChange).toHaveBeenCalledWith('/library')
  })

  it('should call onSend when send button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationForm {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /Send Notification/i }))

    expect(defaultProps.onSend).toHaveBeenCalled()
  })

  it('should disable all fields when sending', () => {
    render(
      <NotificationForm {...defaultProps} sending={true} canSend={false} />
    )

    expect(screen.getByLabelText('Notification Type')).toBeDisabled()
    expect(screen.getByLabelText('Message')).toBeDisabled()
    expect(screen.getByLabelText('Link')).toBeDisabled()
  })

  it('should show Broadcast label when isBroadcast is true', () => {
    render(<NotificationForm {...defaultProps} isBroadcast={true} />)

    expect(
      screen.getByRole('button', { name: /Broadcast/i })
    ).toBeInTheDocument()
  })

  it('should render available links as options', () => {
    render(<NotificationForm {...defaultProps} />)

    const linkSelect = screen.getByLabelText('Link')
    const options = Array.from(linkSelect.querySelectorAll('option'))

    expect(options.length).toBe(PAGE_LINKS.length)
  })

  it('should disable send button when canSend is false', () => {
    render(<NotificationForm {...defaultProps} canSend={false} />)

    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).toBeDisabled()
  })
})
