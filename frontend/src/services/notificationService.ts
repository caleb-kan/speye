import type { Notification } from '../types/database'
import { getNotifications as getNotificationsDb } from '../../../backend/supabase/database/notifications/getNotifications'
import { markNotificationSeen as markNotificationSeenDb } from '../../../backend/supabase/database/notifications/markNotificationSeen'

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
