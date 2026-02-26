import { useMemo, useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { useAuth } from '../hooks/useAuth'
import { NotificationRow } from '../components/notifications/NotificationRow'
import {
  NotificationsTabs,
  type NotificationTab,
} from '../components/notifications/NotificationsTabs'
import { NotificationsSkeleton } from '../components/notifications/NotificationsSkeleton'
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
      <div className="mx-auto mt-6 max-w-4xl px-4 sm:px-8">
        <h1 className="text-2xl font-semibold text-text">Notifications</h1>
        <p className="text-text-secondary mt-1">
          Please log in to view your notifications.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-8 pt-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Notifications</h1>
        <p className="text-text-secondary mt-1">
          Stay up to date with your latest alerts and updates.
        </p>
      </div>

      <div className="flex w-full items-center justify-between mt-4">
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
            className="text-xs"
          >
            Mark all as read
          </Button>
        ) : null}
      </div>

      {loading && !displayedNotifications.length ? (
        <NotificationsSkeleton />
      ) : !displayedNotifications.length ? (
        <div className="rounded-xl border border-dashed border-text-secondary/40 bg-bg-secondary/40 mt-6 p-6 text-text-secondary">
          {activeTab === 'unread'
            ? 'No unread notifications.'
            : 'No read notifications.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-4 pb-6">
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
  )
}
