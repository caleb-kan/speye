import { Calendar } from 'lucide-react'

export function ActivityHeader() {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Activity
        </h1>
        <p className="text-text-secondary mt-1">
          Track your speed reading progress and comprehension.
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
        <Calendar className="w-4 h-4" />
        <span>All Time</span>
      </div>
    </div>
  )
}
