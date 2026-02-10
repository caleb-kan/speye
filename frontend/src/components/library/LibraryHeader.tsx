import { Plus } from 'lucide-react'
import type { LibraryTab } from './LibraryTabs'

export type LibraryHeaderProps = {
  activeTab: LibraryTab
  showUpload: boolean
  onUpload: () => void
}

export function LibraryHeader({
  activeTab,
  showUpload,
  onUpload,
}: LibraryHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Library</h1>
        <p className="text-text-secondary mt-1">
          {activeTab === 'private'
            ? 'Your personal text library'
            : 'Browse public texts'}
        </p>
      </div>
      {showUpload && (
        <button
          type="button"
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg"
        >
          <Plus className="w-5 h-5" />
          Upload Text
        </button>
      )}
    </div>
  )
}
