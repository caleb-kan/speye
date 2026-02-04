import { CircularProgress } from './CircularProgress'

type Props = {
  score: number
  correctCount: number
  totalCount: number
  onClose: () => void
  isSaving: boolean
}

export function QuizResults({
  score,
  correctCount,
  totalCount,
  onClose,
  isSaving,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-4">
      {/* Left Column */}
      <div className="flex flex-col items-center justify-center space-y-6 border-r border-white/5 pr-6 md:pr-12">
        <CircularProgress percentage={score} size={220} />
      </div>

      {/* Right Column */}
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="space-y-2">
          <h2 className="text-3xl font-medium tracking-tight text-white">
            Quiz Complete
          </h2>
          <p className="text-text-secondary text-lg">
            Great effort! Here is how you performed.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
            <div className="text-text-secondary text-sm mb-1">Correct</div>
            <div className="text-2xl font-semibold text-white">
              {correctCount}{' '}
              <span className="text-text-secondary text-lg">
                / {totalCount}
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
            <div className="text-text-secondary text-sm mb-1">Score</div>
            <div className="text-2xl font-semibold text-primary">
              {score}
              <span className="text-sm align-top">%</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="
              w-full py-4 rounded-xl
              bg-white text-black 
              font-bold text-base tracking-wide
              hover:bg-white/90 hover:scale-[1.02]
              active:scale-[0.98]
              transition-all duration-200
              shadow-lg shadow-white/5
            "
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  )
}
