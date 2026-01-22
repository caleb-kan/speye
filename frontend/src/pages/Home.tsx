import { Reader } from '../components/Reader'
import { useTexts } from '../hooks/useTexts'
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom'
import type { ReadingContext } from '../types/reading'
import type { LocationState } from '../types'

export function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText

  const {
    wpm,
    scrolling,
    blurEnabled,
    fiction,
    inputBlocking,
    complexityMin,
    complexityMax,
    textWidthPercent,
    onTextWidthChange,
  } = useOutletContext<ReadingContext>()

  const { currentText, loading, error, selectRandomText, refetch } = useTexts({
    fiction,
    complexityMin,
    complexityMax,
  })

  // Use library text if provided, otherwise use fetched text
  const textToRead = libraryText || currentText

  const handleNewText = () => {
    if (libraryText) {
      // Clear the library text state and use random texts
      navigate('/home', { replace: true, state: null })
    } else {
      selectRandomText()
    }
  }

  // Show loading state (both initial load and refetch)
  const showLoading = loading && !libraryText

  return (
    <div
      className="flex flex-col items-center w-full py-8"
      role="status"
      aria-live="polite"
    >
      {showLoading ? (
        <div className="text-text-secondary text-center">
          <span className="inline-block animate-pulse">Loading texts...</span>
        </div>
      ) : error && !libraryText ? (
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
      ) : textToRead ? (
        <Reader
          key={textToRead.id}
          text={textToRead.content}
          wpm={wpm}
          scrolling={scrolling}
          blurEnabled={blurEnabled}
          onNewText={handleNewText}
          disabled={inputBlocking}
          textWidthPercent={textWidthPercent}
          onTextWidthChange={onTextWidthChange}
        />
      ) : (
        <div className="text-text-secondary text-center">
          No texts available
        </div>
      )}
    </div>
  )
}
