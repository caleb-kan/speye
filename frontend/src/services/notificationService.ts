import type { Notification, NotificationType } from '../types/database'
import { getNotifications as getNotificationsDb } from '../../../backend/supabase/database/notifications/getNotifications'
import { markNotificationSeen as markNotificationSeenDb } from '../../../backend/supabase/database/notifications/markNotificationSeen'
import { markAllNotificationsSeen as markAllNotificationsSeenDb } from '../../../backend/supabase/database/notifications/markAllNotificationsSeen'
import { markNotificationToastShown as markNotificationToastShownDb } from '../../../backend/supabase/database/notifications/markNotificationToastShown'
import { createNotification as createNotificationDb } from '../../../backend/supabase/database/notifications/createNotification'
import { getCachedNotifications, setCachedNotifications } from './offlineCache'
import { enqueueOperation } from './operationQueue'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'

const TAG = 'notificationService'

export const getNotifications = async (
  userId: string
): Promise<Notification[]> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached notifications', { userId })
    return (await getCachedNotifications(userId)) ?? []
  }

  try {
    const notifications = await getNotificationsDb(userId)
    void setCachedNotifications(userId, notifications)
    return notifications
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for notifications, falling back to cache',
      err
    )
    const cached = await getCachedNotifications(userId)
    if (cached) return cached
    throw err
  }
}

export const markNotificationSeen = async (
  notificationId: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — queuing markNotificationSeen', {
      notificationId,
    })
    await enqueueOperation('markNotificationSeen', { id: notificationId })
    return
  }
  await markNotificationSeenDb(notificationId)
}

export const markAllNotificationsSeen = async (
  userId: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — queuing markAllNotificationsSeen', {
      userId,
    })
    await enqueueOperation('markAllNotificationsSeen', { userId })
    return
  }
  await markAllNotificationsSeenDb(userId)
}

export const markNotificationToastShown = async (
  notificationId: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — queuing markNotificationToastShown', {
      notificationId,
    })
    await enqueueOperation('markNotificationToastShown', { id: notificationId })
    return
  }
  await markNotificationToastShownDb(notificationId)
}

export const createNotification = async (
  userId: string,
  message: string,
  type: NotificationType,
  link?: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — skipping notification creation')
    return
  }
  await createNotificationDb(userId, message, type, link)
}
