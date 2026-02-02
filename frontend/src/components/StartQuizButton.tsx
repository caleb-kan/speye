import { useState } from 'react'
import { QuizModal } from './quiz/QuizModal'
import { getQuiz } from '../services/getQuiz'
import type { QuestionSet } from '../types/database'

interface StartQuizButtonProps {
  textId: string | undefined
  readingComplete: boolean
}

export function StartQuizButton({
  textId,
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
      <div className="h-20 flex flex-col items-center justify-center relative z-10 gap-2">
        <button
          onClick={handleLoadQuiz}
          disabled={quizLoading}
          className={`
            px-8 py-4 rounded-full
            bg-primary text-bg font-bold text-lg
            shadow-lg hover:shadow-xl hover:scale-105
            transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100

            ${
              readingComplete
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-12 pointer-events-none'
            }
          `}
        >
          {quizLoading ? 'Loading Quiz...' : 'Start Quiz'}
        </button>
        {quizError && readingComplete && (
          <p className="text-error text-sm animate-in fade-in duration-200">
            {quizError}
          </p>
        )}
      </div>

      <QuizModal
        key={quizKey}
        isOpen={quizOpen}
        onClose={handleCloseQuiz}
        questionSet={quizSet}
      />
    </>
  )
}
