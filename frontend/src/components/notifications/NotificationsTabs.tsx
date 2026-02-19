import { Bell, Check } from 'lucide-react'
import { IconTabs } from '../ui/IconTabs'

export type NotificationTab = 'unread' | 'read'

export type NotificationsTabsProps = {
  activeTab: NotificationTab
  onTabChange: (tab: NotificationTab) => void
  unreadCount?: number
  readCount?: number
}

export function NotificationsTabs({
  activeTab,
  onTabChange,
  unreadCount = 0,
  readCount = 0,
}: NotificationsTabsProps) {
  return (
    <IconTabs
      tabs={[
        {
          id: 'unread',
          label: 'Unread',
          icon: Bell,
          badge: unreadCount,
        },
        {
          id: 'read',
          label: 'Read',
          icon: Check,
          badge: readCount,
        },
      ]}
      activeTab={activeTab}
      onTabChange={onTabChange}
    />
  )
}
