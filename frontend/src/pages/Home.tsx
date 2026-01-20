import { Reader } from '../components/Reader'
import { useTexts } from '../hooks/useTexts'
import { useOutletContext } from 'react-router-dom'
import type { ReadingContext } from '../types/reading'

export function Home() {
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

  return (
    <div
      className="flex flex-col items-center w-full py-8"
      role="status"
      aria-live="polite"
    >
      {loading ? (
        <div className="text-text-secondary text-center">Loading texts...</div>
      ) : error ? (
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
      ) : currentText ? (
        <Reader
          key={currentText.id}
          text={currentText.content}
          wpm={wpm}
          readingType={readingType}
          blurEnabled={blurEnabled}
          onNewText={selectRandomText}
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
