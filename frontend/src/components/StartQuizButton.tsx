import { useState } from 'react'
import { Play } from 'lucide-react'
import { QuizModal } from './quiz/QuizModal'
import { getQuiz } from '../services/getQuiz'
import type { QuestionSet } from '../types/database'

interface StartQuizButtonProps {
  textId: string
  wpm: number
  readingComplete: boolean
}

export function StartQuizButton({
  textId,
  wpm,
  readingComplete,
}: StartQuizButtonProps) {
  const [quizKey, setQuizKey] = useState(0)
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizSet, setQuizSet] = useState<QuestionSet | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)

  const handleLoadQuiz = async () => {
    if (!textId || quizLoading) return

    try {
      setQuizLoading(true)
      setQuizError(null)
      const set = await getQuiz(textId)
      setQuizSet(set)
      setQuizKey((k) => k + 1)
      setQuizOpen(true)
    } catch (err) {
      console.error(err)
      setQuizError(
        err instanceof Error ? err.message : 'Failed to load quiz. Try again.'
      )
    } finally {
      setQuizLoading(false)
    }
  }

  const handleCloseQuiz = () => {
    setQuizOpen(false)
    setQuizError(null)
  }

  return (
    <>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none pb-42">
        <div
          className={`
            relative flex flex-col items-center gap-4 transition-all duration-1000 ease-out
            ${
              readingComplete
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 translate-y-4'
            }
          `}
        >
          <button
            onClick={handleLoadQuiz}
            disabled={quizLoading || !readingComplete}
            className={`
              group relative
              flex items-center gap-3 px-8 py-5
              rounded-2xl
              bg-primary/90 text-bg 
              backdrop-blur-md
              shadow-2xl shadow-primary/20
              font-bold text-lg tracking-wide
              transform transition-all duration-300
              
              ${
                readingComplete
                  ? 'pointer-events-auto cursor-pointer'
                  : 'pointer-events-none'
              }
              
              hover:scale-105 hover:bg-primary hover:shadow-primary/40
              active:scale-95
              disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100
            `}
          >
            {quizLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Quiz</span>
              </>
            )}
          </button>

          {quizError && (
            <div className="absolute top-full mt-4 bg-bg border border-error/20 text-error text-sm px-4 py-2 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2">
              {quizError}
            </div>
          )}
        </div>
      </div>

      <QuizModal
        key={quizKey}
        isOpen={quizOpen}
        onClose={handleCloseQuiz}
        questionSet={quizSet}
        textId={textId}
        wpm={wpm}
      />
    </>
  )
}
