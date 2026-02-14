import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotificationCreator } from '../../../components/admin/notificationCreator/NotificationCreator'

const mockUseNotificationCreator = {
  users: [{ id: 'user-1' }, { id: 'user-2' }],
  loadingUsers: false,
  recipient: '',
  setRecipient: vi.fn(),
  isBroadcast: false,
  setIsBroadcast: vi.fn(),
  notificationType: 'info' as const,
  setNotificationType: vi.fn(),
  message: '',
  setMessage: vi.fn(),
  link: '',
  setLink: vi.fn(),
  sending: false,
  successMessage: null as string | null,
  setSuccessMessage: vi.fn(),
  error: null as string | null,
  setError: vi.fn(),
  handleSend: vi.fn(),
}

let mockIsAdmin = true

vi.mock('../../../hooks/useNotificationCreator', () => ({
  useNotificationCreator: () => mockUseNotificationCreator,
}))

vi.mock('../../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockIsAdmin,
}))

vi.mock('../../../hooks/useAutoClearMessage', () => ({
  useAutoClearMessage: vi.fn(),
}))

describe('NotificationCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin = true
    mockUseNotificationCreator.successMessage = null
    mockUseNotificationCreator.error = null
    mockUseNotificationCreator.sending = false
    mockUseNotificationCreator.loadingUsers = false
    mockUseNotificationCreator.message = ''
    mockUseNotificationCreator.recipient = ''
    mockUseNotificationCreator.isBroadcast = false
  })

  it('should render recipient select and form fields', () => {
    render(<NotificationCreator />)

    expect(screen.getByLabelText('Recipient')).toBeInTheDocument()
    expect(screen.getByLabelText('Notification Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
    expect(screen.getByLabelText('Link')).toBeInTheDocument()
  })

  it('should render send button', () => {
    render(<NotificationCreator />)

    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).toBeInTheDocument()
  })

  it('should show success message when present', () => {
    mockUseNotificationCreator.successMessage = 'Notification sent'
    render(<NotificationCreator />)

    expect(screen.getByText('Notification sent')).toBeInTheDocument()
  })

  it('should show error message when present', () => {
    mockUseNotificationCreator.error = 'Failed to send'
    render(<NotificationCreator />)

    expect(screen.getByText('Failed to send')).toBeInTheDocument()
  })

  it('should disable inputs when sending', () => {
    mockUseNotificationCreator.sending = true
    render(<NotificationCreator />)

    expect(screen.getByLabelText('Recipient')).toBeDisabled()
    expect(screen.getByLabelText('Notification Type')).toBeDisabled()
    expect(screen.getByLabelText('Message')).toBeDisabled()
  })

  it('should disable inputs when loading users', () => {
    mockUseNotificationCreator.loadingUsers = true
    render(<NotificationCreator />)

    expect(screen.getByLabelText('Recipient')).toBeDisabled()
  })

  it('should filter admin-only links for non-admins', () => {
    mockIsAdmin = false
    render(<NotificationCreator />)

    const linkSelect = screen.getByLabelText('Link')
    const options = Array.from(linkSelect.querySelectorAll('option'))
    const labels = options.map((o) => o.textContent)

    expect(labels).not.toContain('Admin')
  })

  it('should include admin-only links for admins', () => {
    mockIsAdmin = true
    render(<NotificationCreator />)

    const linkSelect = screen.getByLabelText('Link')
    const options = Array.from(linkSelect.querySelectorAll('option'))
    const labels = options.map((o) => o.textContent)

    expect(labels).toContain('Admin')
  })

  it('should disable send button when message is empty', () => {
    mockUseNotificationCreator.message = ''
    mockUseNotificationCreator.recipient = 'user-1'
    render(<NotificationCreator />)

    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).toBeDisabled()
  })

  it('should enable send button when recipient and message are set', () => {
    mockUseNotificationCreator.message = 'Hello!'
    mockUseNotificationCreator.recipient = 'user-1'
    render(<NotificationCreator />)

    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).not.toBeDisabled()
  })

  it('should enable send button for broadcast with message', () => {
    mockUseNotificationCreator.message = 'Hello!'
    mockUseNotificationCreator.isBroadcast = true
    render(<NotificationCreator />)

    expect(
      screen.getByRole('button', { name: /Broadcast/i })
    ).not.toBeDisabled()
  })
})
