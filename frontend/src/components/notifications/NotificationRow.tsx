import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { type Notification } from '../../types/database'
import { formatTimestamp } from '../../utils/formatTimestamp'
import { notificationTypeConfig } from '../../utils/notificationTypeConfig'

export function NotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification
  onOpen: () => void
}) {
  const navigate = useNavigate()
  const config = notificationTypeConfig[notification.type]
  const Icon = config.icon

  const handleClick = () => {
    onOpen()
    if (notification.link) {
      navigate(notification.link)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        flex w-full items-start justify-between gap-4 rounded-xl border px-4 py-4 text-left transition
        hover:bg-bg-secondary/80
        focus-visible:outline-none focus-visible:border-2 focus-visible:border-primary
        ${config.classes} ${notification.seen ? 'opacity-80' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5" size={18} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${config.badge}`}
            >
              {config.label}
            </span>
            {!notification.seen ? (
              <span className="text-xs text-primary">New</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-medium text-text">
            {notification.message}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary whitespace-pre-line">
          {formatTimestamp(notification.created_at)}
        </span>
        {notification.link ? (
          <ChevronRight size={16} className="text-text-secondary" />
        ) : null}
      </div>
    </button>
  )
}
