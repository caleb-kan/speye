import type { QuizQuestion } from '../../types/database'
import { OPTION_LABELS } from '../../constants/quiz'

type QuizQuestionEditorProps = {
  question: QuizQuestion
  setIndex: number
  questionIndex: number
  onQuestionTextChange: (text: string) => void
  onOptionChange: (optionIndex: number, text: string) => void
  onCorrectAnswerChange: (optionIndex: number) => void
  disabled?: boolean
}

export function QuizQuestionEditor({
  question,
  setIndex,
  questionIndex,
  onQuestionTextChange,
  onOptionChange,
  onCorrectAnswerChange,
  disabled = false,
}: QuizQuestionEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={`question-${setIndex}-${questionIndex}`}
          className="block text-sm font-medium text-text mb-1 ml-1"
        >
          Question {questionIndex + 1}
        </label>
        <textarea
          id={`question-${setIndex}-${questionIndex}`}
          value={question.question}
          onChange={(e) => onQuestionTextChange(e.target.value)}
          className="w-full text-sm p-2.5 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          rows={2}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2 ml-2">
        {question.options.map((option, optionIndex) => (
          <div key={optionIndex} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${setIndex}-${questionIndex}`}
              checked={question.correctAnswer === optionIndex}
              onChange={() => onCorrectAnswerChange(optionIndex)}
              className="accent-primary"
              disabled={disabled}
              aria-label={`Mark option ${OPTION_LABELS[optionIndex]} as correct`}
            />
            <span className="text-sm font-medium text-text-secondary w-5">
              {OPTION_LABELS[optionIndex]}
            </span>
            <input
              type="text"
              value={option}
              onChange={(e) => onOptionChange(optionIndex, e.target.value)}
              className={`flex-1 text-sm p-2 bg-bg border rounded-lg text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                question.correctAnswer === optionIndex
                  ? 'border-primary/50'
                  : 'border-text-secondary/20'
              }`}
              disabled={disabled}
              aria-label={`Option ${OPTION_LABELS[optionIndex]} text`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
