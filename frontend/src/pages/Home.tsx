import { useNewTextWithReset } from '../hooks/useNewTextWithReset'
import { useReadingContextSync } from '../hooks/useReadingContextSync'
import { useRestoreReadingProgress } from '../hooks/useRestoreReadingProgress'
import { useClearLocationState } from '../hooks/useClearLocationState'
import { useTextNavigation } from '../hooks/useTextNavigation'
import { useAuth } from '../hooks/useAuth'
import { useOutletContext, useLocation } from 'react-router-dom'
import { HomeContent } from '../components/home/HomeContent'
import type { ReadingContext } from '../types/reading'
import type { LocationState } from '../types'

export function Home() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText
  const preservedText = state?.preservedText
  // Timestamp used to force remount when switching from adaptive mode
  const modeTimestamp = state?._ts
  const isSummary = state?.isSummary ?? false

  const { user } = useAuth()
  const context = useOutletContext<ReadingContext>()

  const clearLibraryText = useClearLocationState('/home')

  const { currentText, loading, error, handleNewText, refetch } =
    useTextNavigation({
      filters: {
        fiction: context.fiction,
        complexityMin: context.complexityMin,
        complexityMax: context.complexityMax,
      },
      libraryText,
      preservedText,
      onClearLibraryText: clearLibraryText,
      currentTextComplexity: context.currentTextComplexity,
      userId: user?.id,
    })

  useReadingContextSync(currentText, context)

  const isRestoring = useRestoreReadingProgress(
    currentText,
    context.setReadingPosition
  )

  const handleNewTextWithReset = useNewTextWithReset(
    () => context.setReadingPosition(0),
    handleNewText
  )

  return (
    <div
      className="flex flex-col flex-1 w-full"
      role="status"
      aria-live="polite"
    >
      <HomeContent
        loading={loading || isRestoring}
        error={error}
        currentText={currentText}
        modeTimestamp={modeTimestamp}
        context={context}
        onNewText={handleNewTextWithReset}
        onRefetch={refetch}
        isSummary={isSummary}
        hideNewText={!!libraryText || isSummary}
      />
    </div>
  )
}
