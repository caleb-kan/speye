import { ReadingSession } from '../ReadingSession'
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
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-text-secondary animate-pulse">
          Loading texts...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <button
            type="button"
            onClick={onRefetch}
            className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg rounded"
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
    <div className="flex-1 flex items-center justify-center">
      <span className="text-text-secondary">No texts available</span>
    </div>
  )
}
