import { ProgressIndicator } from './ProgressIndicator'

type QuizHeaderProps = {
  current: number
  total: number
}

export function QuizHeader({ current, total }: QuizHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
        Comprehension Quiz
      </h2>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="text-sm text-text-secondary">
          {current + 1} of {total}
        </span>
        <ProgressIndicator current={current + 1} total={total} />
      </div>
    </div>
  )
}
