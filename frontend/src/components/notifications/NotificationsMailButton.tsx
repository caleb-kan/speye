import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'

export function NotificationsMailButton() {
  const { unseenCount } = useNotifications()

  return (
    <Link
      to="/notifications"
      aria-label="Open notifications"
      className="fixed top-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-bg-secondary/80 text-text shadow-md backdrop-blur-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Mail size={20} />
      {unseenCount > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-bg">
          {unseenCount}
        </span>
      ) : null}
    </Link>
  )
}
