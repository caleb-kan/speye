import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Notifications } from '../../pages/Notifications'
import type { Notification } from '../../types/database'

const { mockState, mockHandlers } = vi.hoisted(() => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      user_id: 'user-1',
      message: 'Unread notification 1',
      type: 'info',
      seen: false,
      toast_shown: false,
      created_at: '2026-02-18T10:00:00Z',
      link: null,
    },
    {
      id: '2',
      user_id: 'user-1',
      message: 'Unread notification 2',
      type: 'alert',
      seen: false,
      toast_shown: false,
      created_at: '2026-02-17T10:00:00Z',
      link: '/library',
    },
    {
      id: '3',
      user_id: 'user-1',
      message: 'Read notification 1',
      type: 'info',
      seen: true,
      toast_shown: true,
      created_at: '2026-02-16T10:00:00Z',
      link: null,
    },
    {
      id: '4',
      user_id: 'user-1',
      message: 'Read notification 2',
      type: 'error',
      seen: true,
      toast_shown: true,
      created_at: '2026-02-15T10:00:00Z',
      link: '/admin',
    },
  ]

  const mockMarkAsSeen = vi.fn()
  const mockMarkAllAsSeen = vi.fn()

  const mockState = {
    notifications: mockNotifications,
    allNotifications: mockNotifications,
    loading: false,
    user: { id: 'user-1', email: 'test@example.com' } as {
      id: string
      email: string
    } | null,
  }

  const mockHandlers = {
    markAsSeen: mockMarkAsSeen,
    markAllAsSeen: mockMarkAllAsSeen,
  }

  return { mockState, mockHandlers }
})

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mockState.notifications,
    loading: mockState.loading,
    markAsSeen: mockHandlers.markAsSeen,
    markAllAsSeen: mockHandlers.markAllAsSeen,
  }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockState.user,
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../utils/formatTimestamp', () => ({
  formatTimestamp: (date: string) => {
    const d = new Date(date)
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
  },
}))

describe('Notifications Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.notifications = mockState.allNotifications
    mockState.loading = false
    mockState.user = { id: 'user-1', email: 'test@example.com' }
  })

  it('should render the page title', () => {
    render(<Notifications />)

    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('should render two tabs: Unread and Read', () => {
    render(<Notifications />)

    expect(screen.getByText('Unread')).toBeInTheDocument()
    expect(screen.getByText('Read')).toBeInTheDocument()
  })

  it('should show badge counts on both tabs', () => {
    render(<Notifications />)

    // Get all buttons and find the tab buttons by their exact text content
    const allButtons = screen.getAllByRole('button')
    const unreadTab = allButtons.find((btn) =>
      btn.textContent?.startsWith('Unread')
    )
    const readTab = allButtons.find((btn) =>
      btn.textContent?.startsWith('Read')
    )

    expect(unreadTab).toBeDefined()
    expect(unreadTab?.textContent).toContain('2')
    expect(readTab).toBeDefined()
    expect(readTab?.textContent).toContain('2')
  })

  it('should default to Unread tab', () => {
    render(<Notifications />)

    expect(screen.getByText('Unread notification 1')).toBeInTheDocument()
    expect(screen.getByText('Unread notification 2')).toBeInTheDocument()
    expect(screen.queryByText('Read notification 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Read notification 2')).not.toBeInTheDocument()
  })

  it('should switch to Read tab when clicked', async () => {
    const user = userEvent.setup()
    render(<Notifications />)

    await user.click(screen.getByText('Read'))

    expect(screen.getByText('Read notification 1')).toBeInTheDocument()
    expect(screen.getByText('Read notification 2')).toBeInTheDocument()
    expect(screen.queryByText('Unread notification 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Unread notification 2')).not.toBeInTheDocument()
  })

  it('should show "Mark all as read" button in Unread tab', () => {
    render(<Notifications />)

    expect(screen.getByText('Mark all as read')).toBeInTheDocument()
  })

  it('should not show "Mark all as read" button in Read tab', async () => {
    const user = userEvent.setup()
    render(<Notifications />)

    await user.click(screen.getByText('Read'))

    expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument()
  })

  it('should enable "Mark all as read" button when there are unread notifications', () => {
    render(<Notifications />)

    const button = screen.getByText('Mark all as read')
    expect(button).toBeEnabled()
  })

  it('should call markAllAsSeen when "Mark all as read" is clicked', async () => {
    const user = userEvent.setup()
    render(<Notifications />)

    await user.click(screen.getByText('Mark all as read'))

    expect(mockHandlers.markAllAsSeen).toHaveBeenCalled()
  })

  it('should sort notifications by date descending', () => {
    render(<Notifications />)

    // Get all buttons (includes tab buttons and notification rows)
    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map((n) => n.textContent)

    // Unread notification 1 (2026-02-18) should come before Unread notification 2 (2026-02-17)
    const index1 = buttonTexts.findIndex((m) =>
      m?.includes('Unread notification 1')
    )
    const index2 = buttonTexts.findIndex((m) =>
      m?.includes('Unread notification 2')
    )

    expect(index1).toBeLessThan(index2)
  })

  it('should show empty state when no unread notifications', () => {
    mockState.notifications = mockState.allNotifications.filter((n) => n.seen)

    render(<Notifications />)

    expect(screen.getByText('No unread notifications.')).toBeInTheDocument()

    const markAllButton = screen.getByText('Mark all as read').closest('button')
    expect(markAllButton).toBeDisabled()
  })

  it('should show loading state', () => {
    mockState.loading = true
    mockState.notifications = []

    const { container } = render(<Notifications />)

    // Check that skeleton loader elements are present
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('should call markAsSeen when a notification is clicked', async () => {
    const user = userEvent.setup()
    render(<Notifications />)

    const notification = screen
      .getByText('Unread notification 1')
      .closest('button')
    await user.click(notification!)

    expect(mockHandlers.markAsSeen).toHaveBeenCalledWith('1')
  })

  it('should show login prompt when user is not logged in', () => {
    mockState.user = null

    render(<Notifications />)

    expect(
      screen.getByText('Please log in to view your notifications.')
    ).toBeInTheDocument()
  })
})
