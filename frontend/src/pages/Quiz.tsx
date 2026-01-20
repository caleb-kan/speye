import { ProgressIndicator } from '../components/quiz/ProgressIndicator'
import { AnswerOption } from '../components/quiz/AnswerOption'

export function Quiz() {
  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-2xl space-y-5 px-6 py-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            Comprehension Quiz
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">1 of 5</span>
            <ProgressIndicator current={1} total={5} />
          </div>
        </div>

        {/* Question */}
        <div className="space-y-1">
          <p className="text-xs text-text-secondary uppercase tracking-wide">
            Question
          </p>
          <h2 className="text-xl font-medium leading-snug">
            What is the main idea of the passage?
          </h2>
        </div>

        {/* Answers */}
        <div className="grid grid-cols-1 gap-3">
          <AnswerOption text="The author argues technology harms focus" />
          <AnswerOption text="The text explains how memory works" />
          <AnswerOption text="The passage describes historical events" />
          <AnswerOption text="The author compares two learning methods" />
        </div>
      </div>
    </div>
  )
}
