import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationRow } from '../../components/notifications/NotificationRow'
import type { Notification } from '../../types/database'

vi.mock('../../utils/formatTimestamp', () => ({
  formatTimestamp: () => {
    return `02/11/2026\n10:00:00`
  },
}))

describe('NotificationRow', () => {
  const mockNotification: Notification = {
    id: '1',
    user_id: 'user-1',
    message: 'Test notification message',
    type: 'info',
    seen: false,
    created_at: '2026-02-11T10:00:00Z',
  }

  const mockOnOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render notification message', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    expect(screen.getByText('Test notification message')).toBeInTheDocument()
  })

  it('should render notification type label', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('should render "New" badge for unseen notifications', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('should not render "New" badge for seen notifications', () => {
    const seenNotification: Notification = {
      ...mockNotification,
      seen: true,
    }

    render(
      <NotificationRow notification={seenNotification} onOpen={mockOnOpen} />
    )

    expect(screen.queryByText('New')).not.toBeInTheDocument()
  })

  it('should call onOpen when clicked', async () => {
    const user = userEvent.setup()
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockOnOpen).toHaveBeenCalled()
  })

  it('should render different label for alert type', () => {
    const alertNotification: Notification = {
      ...mockNotification,
      type: 'alert',
    }

    render(
      <NotificationRow notification={alertNotification} onOpen={mockOnOpen} />
    )

    expect(screen.getByText('Alert')).toBeInTheDocument()
  })

  it('should render different label for error type', () => {
    const errorNotification: Notification = {
      ...mockNotification,
      type: 'error',
    }

    render(
      <NotificationRow notification={errorNotification} onOpen={mockOnOpen} />
    )

    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('should render formatted timestamp', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    // The timestamp is rendered with a newline, so we check for both parts
    expect(screen.getByText(/02\/11\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/10:00:00/)).toBeInTheDocument()
  })

  it('should apply opacity-80 class when notification is seen', () => {
    const seenNotification: Notification = {
      ...mockNotification,
      seen: true,
    }

    const { container } = render(
      <NotificationRow notification={seenNotification} onOpen={mockOnOpen} />
    )

    const button = container.querySelector('button')
    expect(button).toHaveClass('opacity-80')
  })

  it('should not apply opacity-80 class when notification is unseen', () => {
    const { container } = render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    const button = container.querySelector('button')
    expect(button).not.toHaveClass('opacity-80')
  })
})
