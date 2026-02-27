import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationToast } from '../../components/notifications/NotificationToast'
import type { ToastNotification } from '../../context/notificationsContext'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('NotificationToast', () => {
  const mockToast: ToastNotification = {
    notification: {
      id: '1',
      user_id: 'user-1',
      message: 'Test notification',
      type: 'info',
      seen: false,
      toast_shown: false,
      created_at: '2026-02-11T10:00:00Z',
      link: null,
    },
    isExiting: false,
  }

  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render notification message', () => {
    render(<NotificationToast toast={mockToast} onClose={mockOnClose} />)

    expect(
      screen.getByTestId(
        `notification-toast-message-${mockToast.notification.id}`
      )
    ).toHaveTextContent('Test notification')
  })

  it('should render correct label for info type', () => {
    render(<NotificationToast toast={mockToast} onClose={mockOnClose} />)

    expect(
      screen.getByTestId(
        `notification-toast-label-${mockToast.notification.id}`
      )
    ).toHaveTextContent('Info')
  })

  it('should render correct label for alert type', () => {
    const alertToast: ToastNotification = {
      ...mockToast,
      notification: { ...mockToast.notification, type: 'alert' },
    }

    render(<NotificationToast toast={alertToast} onClose={mockOnClose} />)

    expect(
      screen.getByTestId(
        `notification-toast-label-${alertToast.notification.id}`
      )
    ).toHaveTextContent('Alert')
  })

  it('should render correct label for error type', () => {
    const errorToast: ToastNotification = {
      ...mockToast,
      notification: { ...mockToast.notification, type: 'error' },
    }

    render(<NotificationToast toast={errorToast} onClose={mockOnClose} />)

    expect(
      screen.getByTestId(
        `notification-toast-label-${errorToast.notification.id}`
      )
    ).toHaveTextContent('Error')
  })

  it('should call onClose when dismiss button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationToast toast={mockToast} onClose={mockOnClose} />)

    const dismissButton = screen.getByTestId(
      `notification-toast-dismiss-${mockToast.notification.id}`
    )
    await user.click(dismissButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should apply exit animation when isExiting is true', () => {
    const exitingToast: ToastNotification = {
      ...mockToast,
      isExiting: true,
    }

    render(<NotificationToast toast={exitingToast} onClose={mockOnClose} />)

    const toastDiv = screen.getByTestId(
      `notification-toast-${exitingToast.notification.id}`
    )
    expect(toastDiv).toHaveClass('animate-toast-out')
  })

  it('should apply enter animation when isExiting is false', () => {
    render(<NotificationToast toast={mockToast} onClose={mockOnClose} />)

    const toastDiv = screen.getByTestId(
      `notification-toast-${mockToast.notification.id}`
    )
    expect(toastDiv).toHaveClass('animate-toast-in')
  })

  it('should render dismiss button with correct aria-label', () => {
    render(<NotificationToast toast={mockToast} onClose={mockOnClose} />)

    expect(
      screen.getByTestId(
        `notification-toast-dismiss-${mockToast.notification.id}`
      )
    ).toHaveAttribute('aria-label', 'Dismiss notification')
  })

  it('should navigate to link when notification has a link', async () => {
    const linkedToast: ToastNotification = {
      ...mockToast,
      notification: { ...mockToast.notification, link: '/admin' },
    }
    const user = userEvent.setup()

    render(<NotificationToast toast={linkedToast} onClose={mockOnClose} />)

    await user.click(
      screen.getByTestId(
        `notification-toast-button-${linkedToast.notification.id}`
      )
    )

    expect(mockNavigate).toHaveBeenCalledWith('/admin')
  })

  it('should navigate to /notifications when no link', async () => {
    const user = userEvent.setup()

    render(<NotificationToast toast={mockToast} onClose={mockOnClose} />)

    await user.click(
      screen.getByTestId(
        `notification-toast-button-${mockToast.notification.id}`
      )
    )

    expect(mockNavigate).toHaveBeenCalledWith('/notifications')
  })
})
