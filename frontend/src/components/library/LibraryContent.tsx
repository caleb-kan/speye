import type { User } from '@supabase/supabase-js'
import type { TextPreview } from '../../types/database'
import type { LibraryTab } from './LibraryTabs'
import { LibraryTextList } from './LibraryTextList'

export type LibraryContentProps = {
  activeTab: LibraryTab
  user: User | null
  loading: boolean
  isInitialLoad: boolean
  hasActiveFilters: boolean
  paginatedTexts: TextPreview[]
  bestScores: Record<string, number>
  retryingTextIds: Set<string>
  onReadText: (textPreview: TextPreview) => Promise<void>
  onRetryProcessing: (textId: string) => Promise<void>
  onEditText: (textPreview: TextPreview) => Promise<void>
  onDeleteText: (textId: string) => void
}

export function LibraryContent({
  activeTab,
  user,
  loading,
  isInitialLoad,
  hasActiveFilters,
  paginatedTexts,
  bestScores,
  retryingTextIds,
  onReadText,
  onRetryProcessing,
  onEditText,
  onDeleteText,
}: LibraryContentProps) {
  if (activeTab === 'private' && !user) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary mb-2">
          Sign in to access your personal library.
        </p>
        <p className="text-text-secondary text-sm">
          Save and organize your favorite texts for speed reading practice.
        </p>
      </div>
    )
  }

  if (loading && isInitialLoad) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">Loading texts...</p>
      </div>
    )
  }

  if (paginatedTexts.length > 0) {
    return (
      <LibraryTextList
        texts={paginatedTexts}
        activeTab={activeTab}
        bestScores={bestScores}
        retryingTextIds={retryingTextIds}
        onReadText={onReadText}
        onRetryProcessing={onRetryProcessing}
        onEditText={onEditText}
        onDeleteText={onDeleteText}
      />
    )
  }

  return (
    <div className="text-center py-8">
      {hasActiveFilters ? (
        <p className="text-text-secondary mb-2">
          No texts match your search criteria.
        </p>
      ) : activeTab === 'private' ? (
        <>
          <p className="text-text-secondary mb-2">
            Your uploaded texts will appear here.
          </p>
          <p className="text-text-secondary text-sm">
            Click "Upload Text" to add your first text for speed reading
            practice.
          </p>
        </>
      ) : (
        <p className="text-text-secondary">
          No public texts available at the moment.
        </p>
      )}
    </div>
  )
}
