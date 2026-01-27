import { useState, useEffect } from 'react'
import { Reader } from '../components/Reader'
import { useTexts } from '../hooks/useTexts'
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom'
import type { ReadingContext } from '../types/reading'
import { QuizModal } from '../components/quiz/QuizModal'
import type { LocationState } from '../types'

export function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText

  // Local state to track if reading is finished (for quizzes)
  const [readingComplete, setReadingComplete] = useState(false)
  // Counter to force QuizModal remount when opened (resets state)
  const [quizKey, setQuizKey] = useState(0)

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
    quizOpen,
    setQuizOpen,
    setCurrentTextComplexity,
  } = useOutletContext<ReadingContext>()

  const { currentText, loading, error, selectRandomText, refetch } = useTexts({
    fiction,
    complexityMin,
    complexityMax,
  })

  // Use library text if provided, otherwise use fetched text
  const textToRead = libraryText || currentText

  useEffect(() => {
    setCurrentTextComplexity(textToRead?.complexity ?? null)
  }, [textToRead, setCurrentTextComplexity])

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
      className="flex flex-col items-center w-full pt-24 pb-8"
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
          title={textToRead.title}
          text={textToRead.content}
          source={textToRead.source}
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
      ) : (
        <div className="text-text-secondary text-center">
          No texts available
        </div>
      )}

      <div className="h-24 flex items-center justify-center relative z-10">
        <button
          onClick={() => {
            setQuizKey((k) => k + 1)
            setQuizOpen(true)
          }}
          className={`
            px-8 py-4 rounded-full
            bg-primary text-bg font-bold text-lg
            shadow-lg hover:shadow-xl hover:scale-105
            transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            
            ${
              readingComplete
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-12 pointer-events-none'
            }
          `}
        >
          Start Quiz
        </button>
      </div>

      <QuizModal
        key={quizKey}
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
      />
    </div>
  )
}
