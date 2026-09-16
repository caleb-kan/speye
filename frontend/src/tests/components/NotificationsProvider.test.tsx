import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useContext } from 'react'
import { NotificationsProvider } from '../../context/NotificationsProvider'
import { NotificationsContext } from '../../context/notificationsContext'
import type { Notification } from '../../types/database'

const mocks = vi.hoisted(() => ({
  userId: 'reader-a',
  getNotifications: vi.fn(),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: mocks.userId } }),
}))
vi.mock('../../hooks/useNotificationSubscription', () => ({
  useNotificationSubscription: vi.fn(),
}))
vi.mock('../../services/notificationService', () => ({
  getNotifications: mocks.getNotifications,
  markNotificationSeen: vi.fn(),
  markAllNotificationsSeen: vi.fn(),
  markNotificationToastShown: vi.fn().mockResolvedValue(undefined),
}))

const notification = (userId: string): Notification => ({
  id: `${userId}-notification`,
  user_id: userId,
  message: `${userId} private message`,
  type: 'info',
  seen: false,
  toast_shown: false,
  created_at: new Date().toISOString(),
  link: null,
})

function Probe() {
  const value = useContext(NotificationsContext)!
  return (
    <output data-testid="notifications">
      {JSON.stringify({
        notifications: value.notifications.map((item) => item.user_id),
        toasts: value.toasts.map((toast) => toast.notification.user_id),
      })}
    </output>
  )
}

describe('notification account isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.userId = 'reader-a'
  })

  it('removes previous-account notifications and toasts on a live account switch', async () => {
    mocks.getNotifications.mockImplementation(async (userId: string) =>
      userId === 'reader-a' ? [notification(userId)] : []
    )
    const { rerender } = render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    )
    await waitFor(() =>
      expect(screen.getByTestId('notifications').textContent).toBe(
        JSON.stringify({ notifications: ['reader-a'], toasts: ['reader-a'] })
      )
    )
    mocks.userId = 'reader-b'
    rerender(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    )
    await waitFor(() =>
      expect(mocks.getNotifications).toHaveBeenCalledWith('reader-b')
    )
    expect(screen.getByTestId('notifications').textContent).toBe(
      JSON.stringify({ notifications: [], toasts: [] })
    )
  })

  it('ignores a previous account request that finishes after the new account loads', async () => {
    let resolveOld!: (items: Notification[]) => void
    mocks.getNotifications.mockImplementation((userId: string) =>
      userId === 'reader-a'
        ? new Promise<Notification[]>((resolve) => {
            resolveOld = resolve
          })
        : Promise.resolve([notification(userId)])
    )
    const { rerender } = render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    )
    mocks.userId = 'reader-b'
    rerender(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    )
    await waitFor(() =>
      expect(screen.getByTestId('notifications').textContent).toContain(
        'reader-b'
      )
    )
    await act(async () => resolveOld([notification('reader-a')]))
    expect(screen.getByTestId('notifications').textContent).toBe(
      JSON.stringify({ notifications: ['reader-b'], toasts: ['reader-b'] })
    )
  })
})
