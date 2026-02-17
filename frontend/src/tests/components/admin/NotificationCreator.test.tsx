import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { NotificationCreator } from '../../../components/admin/NotificationCreator'

type NotificationCreatorMockState = {
  users: Array<{ id: string; username: string | null }>
  recipient: string
  isBroadcast: boolean
  notificationType: 'info' | 'alert' | 'error'
  message: string
  link: string
  sending: boolean
  successMessage: string | null
  error: string | null
}

type AdminState = { isAdmin: boolean }

const { mockState, mockSetters, mockAdminState } = vi.hoisted(() => {
  const mockState: NotificationCreatorMockState = {
    users: [
      { id: 'user-1', username: 'alice' },
      { id: 'user-2', username: 'bob' },
    ],
    recipient: '',
    isBroadcast: false,
    notificationType: 'info',
    message: '',
    link: '',
    sending: false,
    successMessage: null,
    error: null,
  }

  const mockSetters = {
    setRecipient: vi.fn(),
    setIsBroadcast: vi.fn(),
    setNotificationType: vi.fn(),
    setMessage: vi.fn(),
    setLink: vi.fn(),
    setSuccessMessage: vi.fn(),
    setError: vi.fn(),
    handleSend: vi.fn(),
  }

  const mockAdminState: AdminState = { isAdmin: false }

  return { mockState, mockSetters, mockAdminState }
})

vi.mock('../../../hooks/useNotificationCreator', () => ({
  useNotificationCreator: () => ({
    ...mockState,
    ...mockSetters,
  }),
}))

vi.mock('../../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockAdminState.isAdmin,
}))

vi.mock('../../../hooks/useAutoClearMessage', () => ({
  useAutoClearMessage: vi.fn(),
}))

vi.mock('../../../constants/admin', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../constants/admin')>()
  return {
    ...actual,
    PAGE_LINKS: [
      { value: '/public', label: 'Public Page', adminOnly: false },
      { value: '/admin', label: 'Admin Page', adminOnly: true },
    ],
  }
})

describe('NotificationCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
    mockState.users = [
      { id: 'user-1', username: 'alice' },
      { id: 'user-2', username: 'bob' },
    ]
    mockState.recipient = ''
    mockState.isBroadcast = false
    mockState.message = ''
    mockState.sending = false
    mockState.successMessage = null
    mockState.error = null
    mockAdminState.isAdmin = false
  })

  it('should render recipient select and form fields', () => {
    render(<NotificationCreator />)

    expect(
      screen.getByText((content) => content.includes('Recipient'))
    ).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes('Notification Type'))
    ).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes('Message'))
    ).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes('Link'))
    ).toBeInTheDocument()
  })

  it('should render send button', () => {
    render(<NotificationCreator />)
    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).toBeInTheDocument()
  })

  it('should show success message when present', () => {
    mockState.successMessage = 'Sent successfully!'
    render(<NotificationCreator />)
    expect(screen.getByText('Sent successfully!')).toBeInTheDocument()
  })

  it('should show error message when present', () => {
    mockState.error = 'Failed to send'
    render(<NotificationCreator />)
    expect(screen.getByText('Failed to send')).toBeInTheDocument()
  })

  it('should disable inputs when sending', () => {
    mockState.sending = true
    render(<NotificationCreator />)

    const selects = screen.getAllByRole('combobox')
    selects.forEach((select) => {
      expect(select).toBeDisabled()
    })

    // Get the text area
    expect(screen.getByRole('textbox')).toBeDisabled()

    // Get the button
    expect(
      screen.getByRole('button', { name: /Dispatching.../i })
    ).toBeDisabled()
  })

  it('should filter admin-only links for non-admins', () => {
    mockAdminState.isAdmin = false
    render(<NotificationCreator />)

    expect(screen.getByText('Public Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument()
  })

  it('should include admin-only links for admins', () => {
    mockAdminState.isAdmin = true
    render(<NotificationCreator />)

    expect(screen.getByText('Public Page')).toBeInTheDocument()
    expect(screen.getByText('Admin Page')).toBeInTheDocument()
  })

  it('should disable send button when message is empty', () => {
    mockState.recipient = 'user-1'
    mockState.message = '   '
    render(<NotificationCreator />)

    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).toBeDisabled()
  })

  it('should enable send button when recipient and message are set', () => {
    mockState.recipient = 'user-1'
    mockState.message = 'Hello'
    render(<NotificationCreator />)

    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).not.toBeDisabled()
  })

  it('should enable send button for broadcast with message', () => {
    mockState.recipient = ''
    mockState.isBroadcast = true
    mockState.message = 'Broadcast message'
    render(<NotificationCreator />)

    expect(
      screen.getByRole('button', { name: /Send Notification/i })
    ).not.toBeDisabled()
  })
})
