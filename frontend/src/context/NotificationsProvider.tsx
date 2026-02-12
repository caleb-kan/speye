import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  NotificationsContext,
  type ToastNotification,
} from './notificationsContext'
import { useAuth } from '../hooks/useAuth'
import type { Notification } from '../types/database'
import {
  getNotifications,
  markNotificationSeen,
} from '../services/notificationService'
import { useNotificationSubscription } from '../hooks/useNotificationSubscription'

const AUTO_CLOSE_MS = 5000
const EXIT_ANIMATION_MS = 220

const upsertNotification = (
  items: Notification[],
  next: Notification
): Notification[] => {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) return [next, ...items]

  const updated = [...items]
  updated[index] = next
  return updated
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [loading, setLoading] = useState(false)
  const toastTimeoutsRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  )
  const toastExitTimeoutsRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  )

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setToasts([])
      toastTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      toastExitTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      toastTimeoutsRef.current.clear()
      toastExitTimeoutsRef.current.clear()
      return
    }

    setLoading(true)
    try {
      const data = await getNotifications(userId)
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const toastTimeouts = toastTimeoutsRef.current
    const toastExitTimeouts = toastExitTimeoutsRef.current

    return () => {
      toastTimeouts.forEach((timeout) => clearTimeout(timeout))
      toastExitTimeouts.forEach((timeout) => clearTimeout(timeout))
      toastTimeouts.clear()
      toastExitTimeouts.clear()
    }
  }, [])

  const removeToast = useCallback((notificationId: string) => {
    const timeout = toastTimeoutsRef.current.get(notificationId)
    if (timeout) {
      clearTimeout(timeout)
      toastTimeoutsRef.current.delete(notificationId)
    }

    const exitTimeout = toastExitTimeoutsRef.current.get(notificationId)
    if (exitTimeout) {
      clearTimeout(exitTimeout)
      toastExitTimeoutsRef.current.delete(notificationId)
    }

    setToasts((prev) =>
      prev.filter((toast) => toast.notification.id !== notificationId)
    )
  }, [])

  const dismissToast = useCallback(
    (notificationId: string) => {
      setToasts((prev) =>
        prev.map((toast) =>
          toast.notification.id === notificationId
            ? { ...toast, isExiting: true }
            : toast
        )
      )

      const timeout = toastTimeoutsRef.current.get(notificationId)
      if (timeout) {
        clearTimeout(timeout)
        toastTimeoutsRef.current.delete(notificationId)
      }

      const exitTimeout = toastExitTimeoutsRef.current.get(notificationId)
      if (exitTimeout) {
        clearTimeout(exitTimeout)
        toastExitTimeoutsRef.current.delete(notificationId)
      }

      const removalTimeout = setTimeout(() => {
        removeToast(notificationId)
      }, EXIT_ANIMATION_MS)

      toastExitTimeoutsRef.current.set(notificationId, removalTimeout)
    },
    [removeToast]
  )

  const upsertToast = useCallback(
    (notification: Notification) => {
      setToasts((prev) => {
        const existing = prev.find(
          (toast) => toast.notification.id === notification.id
        )

        if (existing) {
          return prev.map((toast) =>
            toast.notification.id === notification.id
              ? { ...toast, notification }
              : toast
          )
        }

        const nextToast: ToastNotification = {
          notification,
          isExiting: false,
        }

        const exitDelay = Math.max(AUTO_CLOSE_MS - EXIT_ANIMATION_MS, 0)
        const exitTimeout = setTimeout(() => {
          setToasts((current) =>
            current.map((toast) =>
              toast.notification.id === notification.id
                ? { ...toast, isExiting: true }
                : toast
            )
          )
        }, exitDelay)

        const timeout = setTimeout(() => {
          removeToast(notification.id)
        }, AUTO_CLOSE_MS)

        toastTimeoutsRef.current.set(notification.id, timeout)
        toastExitTimeoutsRef.current.set(notification.id, exitTimeout)

        return [nextToast, ...prev]
      })
    },
    [removeToast]
  )

  const markAsSeen = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, seen: true } : item
      )
    )

    try {
      await markNotificationSeen(notificationId)
    } catch (error) {
      console.error('Failed to mark notification as seen', error)
    }
  }, [])

  useNotificationSubscription(userId, {
    onInsert: (notification) => {
      setNotifications((prev) => upsertNotification(prev, notification))
      upsertToast(notification)
    },
    onUpdate: (notification) => {
      setNotifications((prev) => upsertNotification(prev, notification))
      if (notification.seen) {
        removeToast(notification.id)
      } else {
        upsertToast(notification)
      }
    },
    onDelete: (notificationId) => {
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      )
      removeToast(notificationId)
    },
  })

  const unseenCount = useMemo(
    () => notifications.filter((notification) => !notification.seen).length,
    [notifications]
  )

  const value = useMemo(
    () => ({
      notifications,
      toasts,
      unseenCount,
      loading,
      removeToast,
      dismissToast,
      markAsSeen,
      refresh,
    }),
    [
      notifications,
      toasts,
      unseenCount,
      loading,
      removeToast,
      dismissToast,
      markAsSeen,
      refresh,
    ]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
