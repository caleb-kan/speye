import { useMemo } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { useAuth } from '../hooks/useAuth'
import { NotificationRow } from '../components/notifications/NotificationRow'

export function Notifications() {
  const { user } = useAuth()
  const { notifications, loading, markAsSeen } = useNotifications()

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [notifications])

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

      {loading && !sortedNotifications.length ? (
        <div className="rounded-xl border border-text-secondary/30 bg-bg-secondary p-4 text-text-secondary">
          Loading notifications...
        </div>
      ) : null}

      {!sortedNotifications.length && !loading ? (
        <div className="rounded-xl border border-dashed border-text-secondary/40 bg-bg-secondary/40 p-6 text-text-secondary">
          No notifications yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedNotifications.map((notification) => (
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
