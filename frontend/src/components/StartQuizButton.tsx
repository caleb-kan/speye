import { useState, useEffect, useCallback } from 'react'
import { Play, X } from 'lucide-react'
import { QuizModal } from './quiz/QuizModal'
import { getQuiz } from '../services/getQuiz'
import type { QuestionSet } from '../types/database'

interface StartQuizButtonProps {
  textId: string
  ownerId: string | null
  readingComplete: boolean
  onDismiss: () => void
  dismissed: boolean
  forceOpen?: boolean
  onOpenStateChange?: (isOpen: boolean) => void
  /* Optional class override for positioning the button wrapper */
  className?: string
}

export function StartQuizButton({
  textId,
  ownerId,
  readingComplete,
  onDismiss,
  dismissed,
  forceOpen,
  onOpenStateChange,
  className = 'items-center justify-center',
}: StartQuizButtonProps) {
  const [quizKey, setQuizKey] = useState(0)
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizSet, setQuizSet] = useState<QuestionSet | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)

  const handleLoadQuiz = useCallback(async () => {
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
      setQuizError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setQuizLoading(false)
    }
  }, [textId, quizLoading])

  const handleCloseQuiz = () => {
    setQuizOpen(false)
    setQuizError(null)
  }

  const showOverlay = readingComplete && !dismissed

  useEffect(() => {
    if (forceOpen) {
      handleLoadQuiz()
      onOpenStateChange?.(false)
    }
  }, [forceOpen, handleLoadQuiz, onOpenStateChange])

  return (
    <>
      <div
        className={`
          absolute inset-0 flex flex-col z-20 pointer-events-none
          transition-all duration-500 ease-in-out
          ${className} 
          ${showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <div
          className={`
            relative flex flex-col items-center gap-4 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            ${showOverlay ? 'scale-100 translate-y-0' : 'scale-50 translate-y-12'}
          `}
        >
          <div className="relative group">
            {/* Dismiss Button (The 'X') */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              className={`
                absolute -top-3 -right-3 z-30
                w-8 h-8 rounded-full
                bg-bg-secondary border border-text-secondary/20
                text-text-secondary hover:text-text
                flex items-center justify-center
                shadow-lg
                transform transition-all duration-200
                
                ${showOverlay ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}
                ${showOverlay ? 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100' : 'opacity-0'}
              `}
              title="Dismiss to sidebar"
              tabIndex={showOverlay ? 0 : -1}
            >
              <X size={14} />
            </button>

            {/* Main CTA Button */}
            <button
              onClick={handleLoadQuiz}
              disabled={quizLoading || !showOverlay}
              className={`
                relative
                flex items-center gap-3 px-8 py-5
                rounded-2xl
                bg-primary/90 text-bg 
                backdrop-blur-md
                shadow-2xl shadow-primary/20
                font-bold text-lg tracking-wide
                transition-all duration-300
                
                ${showOverlay ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}
                
                hover:scale-105 hover:bg-primary hover:shadow-primary/40
                active:scale-95
              `}
              tabIndex={showOverlay ? 0 : -1}
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
          </div>

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
        ownerId={ownerId}
      />
    </>
  )
}
