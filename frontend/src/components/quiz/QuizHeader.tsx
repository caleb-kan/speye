import { ProgressIndicator } from './ProgressIndicator'

type QuizHeaderProps = {
  current: number
  total: number
}

export function QuizHeader({ current, total }: QuizHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold tracking-tight">
        Comprehension Quiz
      </h2>

      <div className="flex items-center gap-4">
        <span className="text-sm text-text-secondary">
          {current + 1} of {total}
        </span>
        <ProgressIndicator current={current + 1} total={total} />
      </div>
    </div>
  )
}
