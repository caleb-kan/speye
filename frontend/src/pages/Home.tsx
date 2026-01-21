import { Reader } from '../components/Reader'
import { useTexts } from '../hooks/useTexts'
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom'
import type { ReadingContext } from '../types/reading'
import type { Text } from '../types/database'

interface LocationState {
  libraryText?: Text
}

export function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText

  const {
    wpm,
    readingType,
    blurEnabled,
    fiction,
    inputBlocking,
    difficultyMin,
    difficultyMax,
  } = useOutletContext<ReadingContext>()

  const { currentText, loading, error, selectRandomText, refetch } = useTexts({
    fiction,
    difficultyMin,
    difficultyMax,
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

  return (
    <div
      className="flex flex-col items-center w-full py-8"
      role="status"
      aria-live="polite"
    >
      {loading && !libraryText ? (
        <div className="text-text-secondary text-center">Loading texts...</div>
      ) : error && !libraryText ? (
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : textToRead ? (
        <Reader
          key={textToRead.id}
          text={textToRead.content}
          wpm={wpm}
          readingType={readingType}
          blurEnabled={blurEnabled}
          onNewText={handleNewText}
          disabled={inputBlocking}
        />
      ) : (
        <div className="text-text-secondary text-center">
          No texts available
        </div>
      )}
    </div>
  )
}
