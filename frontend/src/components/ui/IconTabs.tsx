import type { LucideIcon } from 'lucide-react'

export type IconTab<T extends string> = {
  id: T
  label: string
  icon: LucideIcon
  badge?: number
}

export type IconTabsProps<T extends string> = {
  tabs: IconTab<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
}

export function IconTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: IconTabsProps<T>) {
  return (
    <div
      className="flex gap-2 mb-0 border-b border-text-secondary/20"
      data-testid="icon-tabs"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? 'text-primary border-primary'
                : 'text-text-secondary border-transparent hover:text-text hover:border-text-secondary/50'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 ? (
              <span
                className={`ml-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-bg-secondary text-text-secondary'
                }`}
                data-testid={`tab-badge-${tab.id}`}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
