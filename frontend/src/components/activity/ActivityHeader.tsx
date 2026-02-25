import { Calendar } from 'lucide-react'

export function ActivityHeader() {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Activity
        </h1>
        <p className="text-text-secondary mt-1">
          Track your speed reading progress and comprehension.
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary bg-text-secondary/10 px-3 py-1.5 rounded-full border border-text-secondary/10">
        <Calendar className="w-4 h-4" />
        <span>All Time</span>
      </div>
    </div>
  )
}
