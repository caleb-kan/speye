import { useEffect, useCallback } from 'react'
import { useTextNavigation } from '../hooks/useTextNavigation'
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom'
import { ReadingSession } from '../components/ReadingSession'
import type { ReadingContext } from '../types/reading'
import type { LocationState } from '../types'

export function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText
  const modeTimestamp = state?._ts

  const context = useOutletContext<ReadingContext>()

  const clearLibraryText = useCallback(() => {
    navigate('/home', { replace: true, state: null })
  }, [navigate])

  const { currentText, loading, error, handleNewText, refetch } =
    useTextNavigation({
      filters: {
        fiction: context.fiction,
        complexityMin: context.complexityMin,
        complexityMax: context.complexityMax,
      },
      libraryText,
      onClearLibraryText: clearLibraryText,
      currentTextComplexity: context.currentTextComplexity,
    })

  // Destructure to avoid missing dependency warning in useEffect
  const { setCurrentTextComplexity } = context

  useEffect(() => {
    setCurrentTextComplexity(currentText?.complexity ?? null)
  }, [currentText, setCurrentTextComplexity])

  return (
    <div
      className="flex flex-col flex-1 w-full"
      role="status"
      aria-live="polite"
    >
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-secondary animate-pulse">
            Loading texts...
          </span>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-error mb-4">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg rounded"
            >
              Try again
            </button>
          </div>
        </div>
      ) : currentText ? (
        <ReadingSession
          // Changing the key forces a remount (and state reset) when text changes
          key={currentText.id}
          currentText={currentText}
          modeTimestamp={modeTimestamp}
          context={context}
          onNewText={handleNewText}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-secondary">No texts available</span>
        </div>
      )}
    </div>
  )
}
