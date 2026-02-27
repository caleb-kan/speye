import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationRow } from '../../components/notifications/NotificationRow'
import type { Notification } from '../../types/database'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

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
    toast_shown: false,
    created_at: '2026-02-11T10:00:00Z',
    link: null,
  }

  const mockOnOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render notification message', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    expect(
      screen.getByTestId(`notification-row-${mockNotification.id}`)
    ).toHaveTextContent('Test notification message')
  })

  it('should render notification type label', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    expect(
      screen.getByTestId(`notification-badge-${mockNotification.id}`)
    ).toHaveTextContent('Info')
  })

  it('should render "New" badge for unseen notifications', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    expect(
      screen.getByTestId(`notification-new-badge-${mockNotification.id}`)
    ).toBeInTheDocument()
  })

  it('should not render "New" badge for seen notifications', () => {
    const seenNotification: Notification = {
      ...mockNotification,
      seen: true,
    }

    render(
      <NotificationRow notification={seenNotification} onOpen={mockOnOpen} />
    )

    expect(
      screen.queryByTestId(`notification-new-badge-${seenNotification.id}`)
    ).not.toBeInTheDocument()
  })

  it('should call onOpen when clicked', async () => {
    const user = userEvent.setup()
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    const button = screen.getByTestId(`notification-row-${mockNotification.id}`)
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

    expect(
      screen.getByTestId(`notification-badge-${alertNotification.id}`)
    ).toHaveTextContent('Alert')
  })

  it('should render different label for error type', () => {
    const errorNotification: Notification = {
      ...mockNotification,
      type: 'error',
    }

    render(
      <NotificationRow notification={errorNotification} onOpen={mockOnOpen} />
    )

    expect(
      screen.getByTestId(`notification-badge-${errorNotification.id}`)
    ).toHaveTextContent('Error')
  })

  it('should apply opacity-80 class when notification is seen', () => {
    const seenNotification: Notification = {
      ...mockNotification,
      seen: true,
    }

    render(
      <NotificationRow notification={seenNotification} onOpen={mockOnOpen} />
    )

    const button = screen.getByTestId(`notification-row-${seenNotification.id}`)
    expect(button).toHaveClass('opacity-80')
  })

  it('should not apply opacity-80 class when notification is unseen', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    const button = screen.getByTestId(`notification-row-${mockNotification.id}`)
    expect(button).not.toHaveClass('opacity-80')
  })

  it('should navigate to link when notification has a link', async () => {
    const linkedNotification: Notification = {
      ...mockNotification,
      link: '/admin',
    }
    const user = userEvent.setup()

    render(
      <NotificationRow notification={linkedNotification} onOpen={mockOnOpen} />
    )

    await user.click(
      screen.getByTestId(`notification-row-${linkedNotification.id}`)
    )

    expect(mockOnOpen).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/admin')
  })

  it('should not navigate when notification has no link', async () => {
    const user = userEvent.setup()

    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    await user.click(
      screen.getByTestId(`notification-row-${mockNotification.id}`)
    )

    expect(mockOnOpen).toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should apply cursor-pointer class for clickable notifications', () => {
    const linkedNotification: Notification = {
      ...mockNotification,
      link: '/library',
    }

    render(
      <NotificationRow notification={linkedNotification} onOpen={mockOnOpen} />
    )

    const button = screen.getByTestId(
      `notification-row-${linkedNotification.id}`
    )
    expect(button).toHaveClass('cursor-pointer')
  })

  it('should apply cursor-default class for non-clickable notifications', () => {
    render(
      <NotificationRow notification={mockNotification} onOpen={mockOnOpen} />
    )

    const button = screen.getByTestId(`notification-row-${mockNotification.id}`)
    expect(button).toHaveClass('cursor-default')
  })
})
