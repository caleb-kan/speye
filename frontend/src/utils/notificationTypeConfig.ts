import { Info, AlertTriangle, XCircle } from 'lucide-react'
import type { NotificationType } from '../types/database'

export const notificationTypeConfig: Record<
  NotificationType,
  {
    icon: typeof Info
    label: string
    classes: string
    bar: string
    badge: string
  }
> = {
  info: {
    icon: Info,
    label: 'Info',
    classes: 'border-primary/40 bg-bg-secondary text-text',
    bar: 'bg-primary',
    badge: 'bg-primary/15 text-primary',
  },
  alert: {
    icon: AlertTriangle,
    label: 'Alert',
    classes: 'border-yellow-400/60 bg-bg-secondary text-text',
    bar: 'bg-yellow-400',
    badge: 'bg-yellow-400/15 text-yellow-300',
  },
  error: {
    icon: XCircle,
    label: 'Error',
    classes: 'border-error/60 bg-bg-secondary text-text',
    bar: 'bg-error',
    badge: 'bg-error/15 text-error',
  },
}
