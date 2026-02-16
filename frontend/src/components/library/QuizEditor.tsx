import { useState, useEffect, useCallback } from 'react'
import type { Quiz, QuizQuestion } from '../../types/database'
import { getErrorMessage } from '../../utils/getErrorMessage'
import { validateQuiz, hasQuizChanged } from '../../utils/quizValidation'
import { QuizSetEditor } from './QuizSetEditor'

type QuizEditorProps = {
  quiz: Quiz
  onSubmit: (quiz: Quiz) => Promise<void>
  onUnsavedChangesUpdate: (hasChanges: boolean) => void
  textHasUnsavedChanges: boolean
}

export function QuizEditor({
  quiz,
  onSubmit,
  onUnsavedChangesUpdate,
  textHasUnsavedChanges,
}: QuizEditorProps) {
  const [editedQuiz, setEditedQuiz] = useState<Quiz>(() =>
    structuredClone(quiz)
  )
  const [expandedSets, setExpandedSets] = useState<Set<number>>(
    () => new Set([0])
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changed = hasQuizChanged(quiz, editedQuiz)

  useEffect(() => {
    onUnsavedChangesUpdate(changed)
  }, [changed, onUnsavedChangesUpdate])

  useEffect(() => {
    setEditedQuiz(structuredClone(quiz))
    setExpandedSets(new Set([0]))
    setError(null)
  }, [quiz])

  const toggleSet = useCallback((setIndex: number) => {
    setExpandedSets((prev) => {
      const next = new Set(prev)
      if (next.has(setIndex)) {
        next.delete(setIndex)
      } else {
        next.add(setIndex)
      }
      return next
    })
  }, [])

  const updateQuestion = useCallback(
    (
      setIndex: number,
      questionIndex: number,
      update: (q: QuizQuestion) => QuizQuestion
    ) => {
      setEditedQuiz((prev) => ({
        ...prev,
        questionSets: prev.questionSets.map((s, si) =>
          si !== setIndex
            ? s
            : {
                ...s,
                questions: s.questions.map((q, qi) =>
                  qi !== questionIndex ? q : update(q)
                ),
              }
        ),
      }))
    },
    []
  )

  const handleSave = async () => {
    setError(null)

    const errors = validateQuiz(editedQuiz)
    if (errors.length > 0) {
      setError(errors.join('; '))
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(editedQuiz)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save quiz'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {editedQuiz.questionSets.map((set, setIndex) => (
          <QuizSetEditor
            key={setIndex}
            set={set}
            setIndex={setIndex}
            expanded={expandedSets.has(setIndex)}
            onToggle={() => toggleSet(setIndex)}
            onQuestionTextChange={(questionIndex, text) =>
              updateQuestion(setIndex, questionIndex, (q) => ({
                ...q,
                question: text,
              }))
            }
            onOptionChange={(questionIndex, optionIndex, text) =>
              updateQuestion(setIndex, questionIndex, (q) => ({
                ...q,
                options: q.options.map((opt, i) =>
                  i === optionIndex ? text : opt
                ),
              }))
            }
            onCorrectAnswerChange={(questionIndex, optionIndex) =>
              updateQuestion(setIndex, questionIndex, (q) => ({
                ...q,
                correctAnswer: optionIndex,
              }))
            }
            disabled={isSubmitting}
          />
        ))}
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {textHasUnsavedChanges && (
        <div className="p-3 bg-text-secondary/10 border border-text-secondary/20 rounded-lg text-text-secondary text-sm">
          Save text changes first. Editing text will regenerate the quiz.
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || !changed || textHasUnsavedChanges}
        >
          {isSubmitting ? 'Saving...' : 'Save Quiz'}
        </button>
      </div>
    </div>
  )
}
