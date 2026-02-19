import { Globe, Lock } from 'lucide-react'
import { IconTabs } from '../ui/IconTabs'

export type LibraryTab = 'private' | 'public'

export type LibraryTabsProps = {
  activeTab: LibraryTab
  onTabChange: (tab: LibraryTab) => void
}

export function LibraryTabs({ activeTab, onTabChange }: LibraryTabsProps) {
  return (
    <IconTabs
      tabs={[
        { id: 'private', label: 'Private', icon: Lock },
        { id: 'public', label: 'Public', icon: Globe },
      ]}
      activeTab={activeTab}
      onTabChange={onTabChange}
    />
  )
}
