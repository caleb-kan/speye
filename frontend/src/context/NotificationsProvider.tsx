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
  markAllNotificationsSeen,
  markNotificationToastShown,
} from '../services/notificationService'
import { useNotificationSubscription } from '../hooks/useNotificationSubscription'
import { TOAST_AUTO_CLOSE_MS, TOAST_EXIT_ANIMATION_MS } from '../constants/ui'
import { pwaLogger } from '../utils/pwaLogger'

const TAG = 'NotificationsProvider'

const persistToastShown = (notificationId: string) => {
  markNotificationToastShown(notificationId).catch((error) =>
    pwaLogger.error(TAG, 'Failed to mark notification toast shown', error)
  )
}

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
        persistToastShown(notificationId)
      }, TOAST_EXIT_ANIMATION_MS)

      toastExitTimeoutsRef.current.set(notificationId, removalTimeout)
    },
    [removeToast]
  )

  const upsertToast = useCallback(
    (notification: Notification) => {
      // If a timeout is already tracked for this notification, the toast exists
      // (or is being added). Just update the notification data in-place.
      if (toastTimeoutsRef.current.has(notification.id)) {
        setToasts((prev) =>
          prev.map((toast) =>
            toast.notification.id === notification.id
              ? { ...toast, notification }
              : toast
          )
        )
        return
      }

      // Clear any leftover exit timeouts from a previous dismissal
      const oldExitTimeout = toastExitTimeoutsRef.current.get(notification.id)
      if (oldExitTimeout) {
        clearTimeout(oldExitTimeout)
        toastExitTimeoutsRef.current.delete(notification.id)
      }

      // Schedule timeouts outside setState to keep updaters pure
      const exitDelay = Math.max(
        TOAST_AUTO_CLOSE_MS - TOAST_EXIT_ANIMATION_MS,
        0
      )
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
        persistToastShown(notification.id)
      }, TOAST_AUTO_CLOSE_MS)

      toastTimeoutsRef.current.set(notification.id, timeout)
      toastExitTimeoutsRef.current.set(notification.id, exitTimeout)

      // Add the new toast with a pure updater (no side effects)
      const nextToast: ToastNotification = {
        notification,
        isExiting: false,
      }
      setToasts((prev) => [nextToast, ...prev])
    },
    [removeToast]
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

      data
        .filter(
          (notification) => !notification.toast_shown && !notification.seen
        )
        .forEach((notification) => upsertToast(notification))
    } catch (err) {
      pwaLogger.error(TAG, 'Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }, [userId, upsertToast])

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

  const markAsSeen = useCallback(async (notificationId: string) => {
    let prevNotifications: Notification[] = []
    setNotifications((prev) => {
      prevNotifications = prev
      return prev.map((item) =>
        item.id === notificationId ? { ...item, seen: true } : item
      )
    })

    try {
      await markNotificationSeen(notificationId)
    } catch (error) {
      pwaLogger.error(TAG, 'Failed to mark notification as seen', error)
      setNotifications(prevNotifications)
    }
  }, [])

  const markAllAsSeen = useCallback(async () => {
    if (!userId) return

    let prevNotifications: Notification[] = []
    setNotifications((prev) => {
      prevNotifications = prev
      return prev.map((item) => ({ ...item, seen: true }))
    })

    try {
      await markAllNotificationsSeen(userId)
    } catch (error) {
      pwaLogger.error(TAG, 'Failed to mark all notifications as seen', error)
      setNotifications(prevNotifications)
    }
  }, [userId])

  useNotificationSubscription(userId, {
    onInsert: (notification) => {
      setNotifications((prev) => upsertNotification(prev, notification))
      upsertToast(notification)
    },
    onUpdate: (notification) => {
      setNotifications((prev) => upsertNotification(prev, notification))
      if (notification.seen || notification.toast_shown) {
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
      markAllAsSeen,
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
      markAllAsSeen,
      refresh,
    ]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
