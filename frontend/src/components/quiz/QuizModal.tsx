import { useState } from 'react'
import { QuizOverlay } from './QuizOverlay'
import { QuizHeader } from './QuizHeader'
import { AnswerOption } from './AnswerOption'
import type { QuestionSet } from '../../types/database'

type QuizModalProps = {
  isOpen: boolean
  onClose: () => void
  questionSet: QuestionSet | null
}

export function QuizModal({ isOpen, onClose, questionSet }: QuizModalProps) {
  // State resets on remount (parent uses key prop to force remount on open)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])

  if (!questionSet) return null
  const questions = questionSet.questions

  const currentQuestion = questions[currentIndex]
  const selectedAnswer = answers[currentIndex]

  function selectAnswer(index: number) {
    const updated = [...answers]
    updated[currentIndex] = index
    setAnswers(updated)
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      onClose()
    }
  }

  return (
    <QuizOverlay isOpen={isOpen} onClose={onClose}>
      {/* Header Section */}
      <div className="mb-8">
        <QuizHeader current={currentIndex} total={questions.length} />
      </div>

      {/* Question Section */}
      <div className="mb-10">
        <h3 className="text-3xl font-medium leading-tight text-text tracking-tight">
          {currentQuestion.question}
        </h3>
      </div>

      {/* Answer Section */}
      <div className="space-y-3 flex flex-col">
        {currentQuestion.options.map((option, i) => (
          <AnswerOption
            key={i}
            text={option}
            selected={selectedAnswer === i}
            onSelect={() => selectAnswer(i)}
          />
        ))}
      </div>

      {/* Footer / Actions */}
      <div className="flex justify-end pt-2 mt-2 border-t border-white/5 h-14">
        {selectedAnswer !== undefined && (
          <button
            onClick={nextQuestion}
            className="
              px-8 py-3 rounded-xl
              bg-white text-black font-medium text-base
              hover:opacity-90
              animate-in fade-in slide-in-from-bottom-2 duration-200
            "
          >
            {currentIndex === questions.length - 1
              ? 'Finish Quiz'
              : 'Next Question'}
          </button>
        )}
      </div>
    </QuizOverlay>
  )
}
