import { useState } from 'react'
import { QuizOverlay } from './QuizOverlay'
import { QuizHeader } from './QuizHeader'
import { AnswerOption } from './AnswerOption'
import type { Question } from '../../types/quizTypes'

type QuizModalProps = {
  isOpen: boolean
  onClose: () => void
}

// TODO: Replace with questions from backend/props
const QUESTIONS: Question[] = [
  {
    id: '1',
    question: 'What is the primary benefit of speed reading?',
    options: [
      'Higher comprehension',
      'Faster processing',
      'Better memory',
      'Reduced eye strain',
    ],
    correctIndex: 1,
  },
  {
    id: '2',
    question: 'Which technique involves minimizing subvocalization?',
    options: [
      'Chunking',
      'Skimming',
      'Meta guiding',
      'Eliminating inner speech',
    ],
    correctIndex: 3,
  },
]

export function QuizModal({ isOpen, onClose }: QuizModalProps) {
  // State resets on remount (parent uses key prop to force remount on open)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])

  const currentQuestion = QUESTIONS[currentIndex]
  const selectedAnswer = answers[currentIndex]

  function selectAnswer(index: number) {
    const updated = [...answers]
    updated[currentIndex] = index
    setAnswers(updated)
  }

  function nextQuestion() {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      onClose()
    }
  }

  return (
    <QuizOverlay isOpen={isOpen} onClose={onClose}>
      {/* Header Section */}
      <div className="mb-8">
        <QuizHeader current={currentIndex} total={QUESTIONS.length} />
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
            {currentIndex === QUESTIONS.length - 1
              ? 'Finish Quiz'
              : 'Next Question'}
          </button>
        )}
      </div>
    </QuizOverlay>
  )
}
