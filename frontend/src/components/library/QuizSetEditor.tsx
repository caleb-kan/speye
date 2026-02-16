import { ChevronDown, ChevronRight } from 'lucide-react'
import type { QuestionSet } from '../../types/database'
import { QuizQuestionEditor } from './QuizQuestionEditor'

type QuizSetEditorProps = {
  set: QuestionSet
  setIndex: number
  expanded: boolean
  onToggle: () => void
  onQuestionTextChange: (questionIndex: number, text: string) => void
  onOptionChange: (
    questionIndex: number,
    optionIndex: number,
    text: string
  ) => void
  onCorrectAnswerChange: (questionIndex: number, optionIndex: number) => void
  disabled?: boolean
}

export function QuizSetEditor({
  set,
  setIndex,
  expanded,
  onToggle,
  onQuestionTextChange,
  onOptionChange,
  onCorrectAnswerChange,
  disabled = false,
}: QuizSetEditorProps) {
  return (
    <div className="bg-bg-secondary rounded-lg border border-text-secondary/20">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full p-3 text-left hover:bg-bg/50 rounded-lg transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        )}
        <span className="text-sm font-medium text-text">
          Question Set {setIndex + 1}
        </span>
        <span className="text-xs text-text-secondary">
          ({set.questions.length} questions)
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {set.questions.map((question, questionIndex) => (
            <QuizQuestionEditor
              key={questionIndex}
              question={question}
              setIndex={setIndex}
              questionIndex={questionIndex}
              onQuestionTextChange={(text) =>
                onQuestionTextChange(questionIndex, text)
              }
              onOptionChange={(optionIndex, text) =>
                onOptionChange(questionIndex, optionIndex, text)
              }
              onCorrectAnswerChange={(optionIndex) =>
                onCorrectAnswerChange(questionIndex, optionIndex)
              }
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}
