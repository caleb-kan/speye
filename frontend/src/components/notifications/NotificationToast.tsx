import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import type { ToastNotification } from '../../context/notificationsContext'
import { notificationTypeConfig } from '../../utils/notificationTypeConfig'

export const NotificationToast = memo(function NotificationToast({
  toast,
  onClose,
}: {
  toast: ToastNotification
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { notification, isExiting } = toast
  const config = useMemo(
    () => notificationTypeConfig[notification.type],
    [notification.type]
  )
  const Icon = config.icon

  return (
    <div
      className={`
        group
        relative
        w-full
        rounded-xl border
        px-4 py-3
        shadow-lg
        transition-transform
        hover:-translate-y-0.5
        ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}
        ${config.classes}
      `}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => navigate(notification.link ?? '/notifications')}
        className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={notification.link ? 'Go to details' : 'Open notifications'}
      >
        <Icon className="mt-0.5" size={18} />
        <div className="flex-1 text-left">
          <div className="text-xs uppercase tracking-wide text-text-secondary">
            {config.label}
          </div>
          <div className="text-sm font-medium text-text">
            {notification.message}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 rounded-full p-1 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
})
