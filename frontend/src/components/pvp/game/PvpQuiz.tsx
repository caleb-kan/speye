import { useState, useCallback, useRef } from 'react'
import { useRefSync } from '../../../hooks/useRefSync'
import { QuizHeader } from '../../quiz/QuizHeader'
import { AnswerOption } from '../../quiz/AnswerOption'
import { PvpQuizTimer } from './PvpQuizTimer'
import {
  PVP_QUIZ_QUESTION_TIMER_S,
  PVP_ANSWER_STAGGER_MS,
} from '../../../constants/pvp'
import type { QuestionSet } from '../../../types/database'

type PvpQuizProps = {
  questionSet: QuestionSet
  onFinish: (score: number) => void
}

export function PvpQuiz({ questionSet, onFinish }: PvpQuizProps) {
  const questions = questionSet.questions
  const onFinishRef = useRefSync(onFinish)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  )
  const [timerKey, setTimerKey] = useState(0)

  const answersRef = useRefSync(answers)
  const currentIndexRef = useRefSync(currentIndex)

  const advancingRef = useRef(false)
  const finishedRef = useRef(false)

  const advanceQuestion = useCallback(() => {
    // Guard against duplicate calls within the same microtask (e.g. timer
    // expiry + button click firing in the same event loop tick).
    if (advancingRef.current || finishedRef.current) return
    advancingRef.current = true
    queueMicrotask(() => {
      advancingRef.current = false
    })

    const idx = currentIndexRef.current
    if (idx < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setTimerKey((k) => k + 1)
    } else {
      finishedRef.current = true
      // "I don't know" (idkIndex) and unanswered (null) both count as
      // incorrect; no penalty beyond missing the point.
      const currentAnswers = answersRef.current
      const correct = questions.filter(
        (q, i) => currentAnswers[i] === q.correctAnswer
      ).length
      const score = Math.round((correct / questions.length) * 100)
      onFinishRef.current(score)
    }
  }, [questions, onFinishRef, currentIndexRef, answersRef])

  if (questions.length === 0) return null

  const currentQuestion = questions[currentIndex]
  const selectedAnswer = answers[currentIndex]

  function selectAnswer(index: number) {
    const updated = [...answers]
    updated[currentIndex] = index
    setAnswers(updated)
  }

  const idkIndex = currentQuestion.options.length

  return (
    <div className="flex-1 flex items-center justify-center p-4 pb-20">
      <div className="w-full max-w-6xl rounded-3xl bg-bg shadow-2xl p-4 sm:p-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <QuizHeader current={currentIndex} total={questions.length} />
          <PvpQuizTimer
            durationSeconds={PVP_QUIZ_QUESTION_TIMER_S}
            onExpire={advanceQuestion}
            resetKey={timerKey}
          />
        </div>

        <div key={currentIndex} className="flex flex-col">
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            <h3 className="text-xl sm:text-3xl font-medium leading-tight text-text tracking-tight">
              {currentQuestion.question}
            </h3>
          </div>

          <div className="space-y-3 flex flex-col">
            {currentQuestion.options.map((option, i) => (
              <div
                key={`${currentIndex}-${i}`}
                className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards"
                style={{
                  animationDuration: '500ms',
                  animationDelay: `${i * PVP_ANSWER_STAGGER_MS}ms`,
                }}
              >
                <AnswerOption
                  text={option}
                  selected={selectedAnswer === i}
                  onSelect={() => selectAnswer(i)}
                />
              </div>
            ))}

            <div
              className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards"
              style={{
                animationDuration: '500ms',
                animationDelay: `${currentQuestion.options.length * PVP_ANSWER_STAGGER_MS}ms`,
              }}
            >
              <button
                aria-label="I don't know"
                aria-pressed={selectedAnswer === idkIndex}
                onClick={() => selectAnswer(idkIndex)}
                className={`
                  group relative w-full text-left
                  px-4 sm:px-8 py-2
                  rounded-xl border-dashed border
                  transition-all duration-200 ease-out italic
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  ${
                    selectedAnswer === idkIndex
                      ? 'bg-primary text-bg font-medium shadow-lg scale-[1.01] border-primary'
                      : 'bg-bg-secondary/50 text-text-secondary hover:bg-bg-secondary hover:text-text border-text-secondary/30'
                  }
                `}
              >
                <span className="block text-lg leading-relaxed">
                  I don't know
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4 mt-4 border-t border-text-secondary/10 h-16">
            {selectedAnswer !== null && (
              <button
                onClick={advanceQuestion}
                className="
                  px-8 py-3 rounded-xl
                  bg-text text-bg font-medium text-base
                  hover:scale-105 active:scale-95
                  transition-all duration-300
                  animate-in fade-in slide-in-from-bottom-2
                  shadow-lg shadow-text/5
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                "
              >
                {currentIndex === questions.length - 1
                  ? 'Finish Quiz'
                  : 'Next Question'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
