import { useNotifications } from '../../hooks/useNotifications'
import { NotificationToast } from './NotificationToast'
import { Z_INDEX } from '../../constants/ui'

export function NotificationToaster() {
  const { toasts, dismissToast } = useNotifications()

  if (!toasts.length) return null

  return (
    <div
      className="fixed top-16 right-4 flex w-80 flex-col gap-3"
      style={{ zIndex: Z_INDEX.NOTIFICATION_TOASTER }}
    >
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
