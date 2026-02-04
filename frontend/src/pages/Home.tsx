import { useState, useEffect, useCallback } from 'react'
import { Reader } from '../components/Reader'
import { StartQuizButton } from '../components/StartQuizButton'
import { useTextNavigation } from '../hooks/useTextNavigation'
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom'
import type { ReadingContext } from '../types/reading'
import type { LocationState } from '../types'

export function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText
  const modeTimestamp = state?._ts

  const [readingComplete, setReadingComplete] = useState(false)

  const {
    wpm,
    scrolling,
    blurEnabled,
    fiction,
    inputBlocking,
    complexityMin,
    complexityMax,
    textWidthPercent,
    visibleLines,
    onTextWidthChange,
    currentTextComplexity,
    setCurrentTextComplexity,
  } = useOutletContext<ReadingContext>()

  const clearLibraryText = useCallback(() => {
    navigate('/home', { replace: true, state: null })
  }, [navigate])

  const { currentText, loading, error, handleNewText, refetch } =
    useTextNavigation({
      filters: { fiction, complexityMin, complexityMax },
      libraryText,
      onClearLibraryText: clearLibraryText,
      currentTextComplexity,
    })

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
        <div className="relative flex-1 flex flex-col w-full h-full overflow-hidden pb-20">
          <Reader
            key={`${currentText.id}-${modeTimestamp ?? ''}`}
            title={currentText.title}
            text={currentText.content}
            source={currentText.source}
            wpm={wpm}
            scrolling={scrolling}
            blurEnabled={blurEnabled}
            onNewText={handleNewText}
            disabled={inputBlocking}
            textWidthPercent={textWidthPercent}
            onTextWidthChange={onTextWidthChange}
            visibleLines={visibleLines}
            onComplete={setReadingComplete}
          />

          <StartQuizButton
            wpm={wpm}
            textId={currentText.id}
            readingComplete={readingComplete}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-secondary">No texts available</span>
        </div>
      )}
    </div>
  )
}
