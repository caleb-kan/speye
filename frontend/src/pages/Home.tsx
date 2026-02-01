import { useState, useEffect, useCallback } from 'react'
import { Reader } from '../components/Reader'
import { useTextNavigation } from '../hooks/useTextNavigation'
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom'
import type { ReadingContext } from '../types/reading'
import { QuizModal } from '../components/quiz/QuizModal'
import type { LocationState } from '../types'

export function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText
  // Timestamp used to force remount when switching from adaptive mode
  const modeTimestamp = state?._ts

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
        <>
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

          {/* Quiz button - appears after reading completes */}
          <div className="h-20 flex items-center justify-center relative z-10">
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
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-secondary">No texts available</span>
        </div>
      )}

      <QuizModal
        key={quizKey}
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
      />
    </div>
  )
}
