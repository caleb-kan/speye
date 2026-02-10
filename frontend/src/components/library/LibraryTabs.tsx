import { Globe, Lock } from 'lucide-react'

export type LibraryTab = 'private' | 'public'

export type LibraryTabsProps = {
  activeTab: LibraryTab
  onTabChange: (tab: LibraryTab) => void
}

export function LibraryTabs({ activeTab, onTabChange }: LibraryTabsProps) {
  return (
    <div className="flex gap-2 mb-6 border-b border-text-secondary/20">
      <button
        type="button"
        onClick={() => onTabChange('private')}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
          activeTab === 'private'
            ? 'text-primary border-primary'
            : 'text-text-secondary border-transparent hover:text-text hover:border-text-secondary/50'
        }`}
      >
        <Lock className="w-4 h-4" />
        Private
      </button>
      <button
        type="button"
        onClick={() => onTabChange('public')}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
          activeTab === 'public'
            ? 'text-primary border-primary'
            : 'text-text-secondary border-transparent hover:text-text hover:border-text-secondary/50'
        }`}
      >
        <Globe className="w-4 h-4" />
        Public
      </button>
    </div>
  )
}
