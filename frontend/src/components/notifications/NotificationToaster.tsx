import { useNotifications } from '../../hooks/useNotifications'
import { NotificationToast } from './NotificationToast'

export function NotificationToaster() {
  const { toasts, dismissToast } = useNotifications()

  if (!toasts.length) return null

  return (
    <div className="fixed top-16 right-4 z-50 flex w-80 flex-col gap-3">
      {toasts.map((notification) => (
        <NotificationToast
          key={notification.notification.id}
          toast={notification}
          onClose={() => dismissToast(notification.notification.id)}
        />
      ))}
    </div>
  )
}
