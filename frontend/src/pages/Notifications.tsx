import { useMemo, useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { useAuth } from '../hooks/useAuth'
import { NotificationRow } from '../components/notifications/NotificationRow'
import {
  NotificationsTabs,
  type NotificationTab,
} from '../components/notifications/NotificationsTabs'
import { Button } from '../components/ui/Button'
import type { Notification } from '../types/database'

function byDateDescending(a: Notification, b: Notification): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

export function Notifications() {
  const { user } = useAuth()
  const { notifications, loading, markAsSeen, markAllAsSeen } =
    useNotifications()
  const [activeTab, setActiveTab] = useState<NotificationTab>('unread')

  const unreadNotifications = useMemo(
    () => [...notifications.filter((n) => !n.seen)].sort(byDateDescending),
    [notifications]
  )

  const readNotifications = useMemo(
    () => [...notifications.filter((n) => n.seen)].sort(byDateDescending),
    [notifications]
  )

  const displayedNotifications =
    activeTab === 'unread' ? unreadNotifications : readNotifications

  if (!user) {
    return (
      <div className="mx-auto mt-16 max-w-3xl px-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-4 text-text-secondary">
          Please log in to view your notifications.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-16 flex w-full max-w-4xl flex-col gap-6 px-6 pb-16">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Stay up to date with your latest alerts and updates.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <NotificationsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCount={unreadNotifications.length}
            readCount={readNotifications.length}
          />
          {activeTab === 'unread' ? (
            <Button
              variant="secondary"
              onClick={markAllAsSeen}
              disabled={unreadNotifications.length === 0}
              className="text-sm"
            >
              Mark all as read
            </Button>
          ) : null}
        </div>

        {loading && !displayedNotifications.length ? (
          <div className="rounded-xl border border-text-secondary/30 bg-bg-secondary p-4 text-text-secondary">
            Loading notifications...
          </div>
        ) : null}

        {!displayedNotifications.length && !loading ? (
          <div className="rounded-xl border border-dashed border-text-secondary/40 bg-bg-secondary/40 p-6 text-text-secondary">
            {activeTab === 'unread'
              ? 'No unread notifications.'
              : 'No read notifications.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayedNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onOpen={() => markAsSeen(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
