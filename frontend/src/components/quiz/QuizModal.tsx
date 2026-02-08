import { useState } from 'react'
import { QuizOverlay } from './QuizOverlay'
import { QuizHeader } from './QuizHeader'
import { AnswerOption } from './AnswerOption'
import { QuizResults } from './QuizResults'
import { saveQuizResult } from '../../services/saveQuizResult'

export type Question = {
  question: string
  options: string[]
  correctAnswer: number
}

export type QuestionSet = {
  questions: Question[]
}

type QuizModalProps = {
  isOpen: boolean
  onClose: () => void
  questionSet: QuestionSet | null
  textId: string
}

export function QuizModal({
  isOpen,
  onClose,
  questionSet,
  textId,
}: QuizModalProps) {
  // State
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])

  const [isFinished, setIsFinished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  if (!questionSet) return null

  const questions = questionSet.questions
  const currentQuestion = questions[currentIndex]
  const selectedAnswer = answers[currentIndex]

  // --- Handlers ---

  function selectAnswer(index: number) {
    const updated = [...answers]
    updated[currentIndex] = index
    setAnswers(updated)
  }

  async function finishQuiz() {
    let correctCount = 0
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correctCount++
      }
    })
    const finalScore = Math.round((correctCount / questions.length) * 100)

    setIsFinished(true)
    setIsSaving(true)
    try {
      await saveQuizResult({
        text_id: textId,
        score: finalScore,
      })
    } catch (err) {
      console.error('Failed to save quiz result:', err)
    } finally {
      setIsSaving(false)
    }
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      finishQuiz()
    }
  }

  const correctAnswersCount = questions.reduce((acc, q, idx) => {
    return acc + (answers[idx] === q.correctAnswer ? 1 : 0)
  }, 0)

  const finalScore = Math.round((correctAnswersCount / questions.length) * 100)

  return (
    <QuizOverlay isOpen={isOpen} onClose={onClose}>
      {isFinished ? (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <QuizResults
            score={finalScore}
            correctCount={correctAnswersCount}
            totalCount={questions.length}
            onClose={onClose}
            isSaving={isSaving}
          />
        </div>
      ) : (
        <>
          <div className="mb-8">
            <QuizHeader current={currentIndex} total={questions.length} />
          </div>

          {/* Re-trigger CSS animations (re-mounting with key) */}
          <div key={currentIndex} className="flex flex-col">
            {/* Question Text */}
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <h3 className="text-3xl font-medium leading-tight text-text tracking-tight">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Options Staggered */}
            <div className="space-y-3 flex flex-col">
              {currentQuestion.options.map((option, i) => (
                <div
                  key={i}
                  className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards"
                  style={{
                    animationDuration: '500ms',
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  <AnswerOption
                    text={option}
                    selected={selectedAnswer === i}
                    onSelect={() => selectAnswer(i)}
                  />
                </div>
              ))}
            </div>

            {/* Next Button Container */}
            <div className="flex justify-end pt-4 mt-4 border-t border-white/5 h-16">
              {selectedAnswer !== undefined && (
                <button
                  onClick={nextQuestion}
                  className="
                    px-8 py-3 rounded-xl
                    bg-white text-black font-medium text-base
                    hover:scale-105 active:scale-95
                    transition-all duration-300
                    animate-in fade-in slide-in-from-bottom-2
                    shadow-lg shadow-white/5
                  "
                >
                  {currentIndex === questions.length - 1
                    ? 'Finish Quiz'
                    : 'Next Question'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </QuizOverlay>
  )
}
