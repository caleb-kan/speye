export type NotificationType = 'info' | 'alert' | 'error'

export interface Notification {
  id: string
  user_id: string
  message: string
  type: NotificationType
  seen: boolean
  toast_shown: boolean
  created_at: string
  link: string | null
}
