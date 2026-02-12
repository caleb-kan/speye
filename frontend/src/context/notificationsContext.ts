import { createContext } from 'react'
import type { Notification } from '../types/database'

export type ToastNotification = {
  notification: Notification
  isExiting: boolean
}

export interface NotificationsContextType {
  notifications: Notification[]
  toasts: ToastNotification[]
  unseenCount: number
  loading: boolean
  removeToast: (notificationId: string) => void
  dismissToast: (notificationId: string) => void
  markAsSeen: (notificationId: string) => Promise<void>
  refresh: () => Promise<void>
}

export const NotificationsContext =
  createContext<NotificationsContextType | null>(null)
