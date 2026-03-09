import { X, Check } from 'lucide-react'
import type { Quiz } from '../../../types/database.ts'
import { useEscapeKey } from '../../../hooks/useEscapeKey.ts'
import { UNTITLED_TEXT_FALLBACK } from '../../../constants/admin.ts'

interface QuizPreviewModalProps {
  quiz: Quiz | null
  title: string | null
  onClose: () => void
}

export function QuizPreviewModal({
  quiz,
  title,
  onClose,
}: QuizPreviewModalProps) {
  useEscapeKey(onClose, !!quiz)

  if (!quiz) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-preview-title"
    >
      <div className="bg-bg rounded-lg max-w-3xl w-full max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-bg border-b border-text-secondary/20 p-4 flex items-center justify-between">
          <h2
            id="quiz-preview-title"
            className="text-xl font-semibold text-text"
          >
            Quiz: {title || UNTITLED_TEXT_FALLBACK}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-8">
          {quiz.questionSets.map((set, setIndex) => (
            <div key={`set-${setIndex}`}>
              <h3 className="text-sm font-medium text-text-secondary mb-4">
                Question Set {setIndex + 1}
              </h3>
              <div className="space-y-6">
                {set.questions.map((q, qIndex) => (
                  <div
                    key={`q-${setIndex}-${qIndex}`}
                    className="bg-bg-secondary rounded-lg p-4"
                  >
                    <p className="font-medium text-text mb-3">
                      {qIndex + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((option, optIndex) => {
                        const isCorrect = optIndex === q.correctAnswer
                        return (
                          <div
                            key={`opt-${setIndex}-${qIndex}-${optIndex}`}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                              isCorrect
                                ? 'bg-success/10 border border-success/30 text-success'
                                : 'bg-bg text-text-secondary'
                            }`}
                          >
                            {isCorrect && (
                              <Check size={14} className="shrink-0" />
                            )}
                            <span>{option}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
