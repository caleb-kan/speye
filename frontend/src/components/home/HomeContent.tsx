import { AlertCircle, BookOpen } from 'lucide-react'
import { ReadingSession } from '../ReadingSession'
import { HomeSkeleton } from './HomeSkeleton'
import type { Text } from '../../types/database'
import type { ReadingContext } from '../../types/reading'

export type HomeContentProps = {
  loading: boolean
  error: string | null
  currentText: Text | null
  modeTimestamp?: number
  context: ReadingContext
  onNewText: () => void
  onRefetch: () => void
  isSummary?: boolean
}

export function HomeContent({
  loading,
  error,
  currentText,
  modeTimestamp,
  context,
  onNewText,
  onRefetch,
  isSummary,
}: HomeContentProps) {
  if (loading) {
    return <HomeSkeleton />
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text mb-2">
            Unable to load text
          </h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            type="button"
            onClick={onRefetch}
            className="px-6 py-2.5 bg-primary text-bg font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg transition-all"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (currentText) {
    return (
      <ReadingSession
        key={currentText.id}
        currentText={currentText}
        modeTimestamp={modeTimestamp}
        context={context}
        onNewText={onNewText}
        isSummary={isSummary}
      />
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <BookOpen className="w-12 h-12 text-text-secondary/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-text mb-2">
          No texts available
        </h2>
        <p className="text-text-secondary">
          There are no texts matching your current filters. Try adjusting your
          preferences or check back later.
        </p>
      </div>
    </div>
  )
}
