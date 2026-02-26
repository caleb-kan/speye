import type { User } from '@supabase/supabase-js'
import type { TextPreview } from '../../types/database'
import type { LibraryTab } from './LibraryTabs'
import { LibraryTextList } from './LibraryTextList'
import { ListSkeleton } from '../ui/SkeletonLoader'

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
  onReadSummary: (textPreview: TextPreview) => Promise<void>
  onRetryProcessing: (textId: string) => Promise<void>
  onEditText: (textPreview: TextPreview) => Promise<void>
  onDeleteText: (textId: string) => void
  isAdmin?: boolean
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
  onReadSummary,
  onRetryProcessing,
  onEditText,
  onDeleteText,
  isAdmin = false,
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
    return <ListSkeleton count={4} />
  }

  if (paginatedTexts.length > 0) {
    return (
      <LibraryTextList
        texts={paginatedTexts}
        activeTab={activeTab}
        bestScores={bestScores}
        retryingTextIds={retryingTextIds}
        onReadText={onReadText}
        onReadSummary={onReadSummary}
        onRetryProcessing={onRetryProcessing}
        onEditText={onEditText}
        onDeleteText={onDeleteText}
        isAdmin={isAdmin}
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
