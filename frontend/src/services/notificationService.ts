import type { Notification, NotificationType } from '../types/database'
import { getNotifications as getNotificationsDb } from '../../../backend/supabase/database/notifications/getNotifications'
import { markNotificationSeen as markNotificationSeenDb } from '../../../backend/supabase/database/notifications/markNotificationSeen'
import { markAllNotificationsSeen as markAllNotificationsSeenDb } from '../../../backend/supabase/database/notifications/markAllNotificationsSeen'
import { markNotificationToastShown as markNotificationToastShownDb } from '../../../backend/supabase/database/notifications/markNotificationToastShown'
import { createNotification as createNotificationDb } from '../../../backend/supabase/database/notifications/createNotification'

export const getNotifications = async (
  userId: string
): Promise<Notification[]> => {
  return getNotificationsDb(userId)
}

export const markNotificationSeen = async (
  notificationId: string
): Promise<void> => {
  await markNotificationSeenDb(notificationId)
}

export const markAllNotificationsSeen = async (
  userId: string
): Promise<void> => {
  await markAllNotificationsSeenDb(userId)
}

export const markNotificationToastShown = async (
  notificationId: string
): Promise<void> => {
  await markNotificationToastShownDb(notificationId)
}

export const createNotification = async (
  userId: string,
  message: string,
  type: NotificationType,
  link?: string
): Promise<void> => {
  await createNotificationDb(userId, message, type, link)
}
