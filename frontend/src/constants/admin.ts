import type { NotificationType } from '../types'

export type ApprovalFilterTab = 'flagged' | 'passed'

export const DEFAULT_APPROVAL_FILTER_TAB: ApprovalFilterTab = 'flagged'

export const ADMIN_TEXT_PREVIEW_LENGTH = 80

export const UNTITLED_TEXT_FALLBACK = 'Untitled Text'

export const ADMIN_BADGE_CLASSES = {
  error: 'bg-error/20 text-error',
  warning: 'bg-yellow-500/20 text-yellow-400',
  muted: 'bg-text-secondary/20 text-text-secondary',
  info: 'bg-primary/20 text-primary',
  orange: 'bg-orange-500/20 text-orange-400',
} as const

export const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] =
  [
    { value: 'info', label: 'Info' },
    { value: 'alert', label: 'Alert' },
    { value: 'error', label: 'Error' },
  ]

export const BROADCAST_VALUE = '__broadcast__'

type PageLink = { value: string; label: string; adminOnly?: boolean }
export const PAGE_LINKS: PageLink[] = [
  { value: '', label: 'None' },
  { value: '/home', label: 'Home' },
  { value: '/library', label: 'Library' },
  { value: '/adaptive', label: 'Adaptive Reading' },
  { value: '/activity', label: 'Activity' },
  { value: '/settings', label: 'Settings' },
  { value: '/notifications', label: 'Notifications' },
  { value: '/admin', label: 'Admin', adminOnly: true },
]
