import { HeaderSkeleton, ListSkeleton } from '../ui/SkeletonLoader'

export function LibrarySkeleton() {
  return (
    <div className="flex flex-col items-center w-full px-4 sm:px-8 pt-6 pb-20">
      <div className="w-full max-w-4xl space-y-6">
        <HeaderSkeleton />

        {/* Tabs */}
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-24 bg-text-secondary/10 rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Filter Bar */}
        <div className="space-y-3">
          <div className="flex gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-10 w-32 bg-text-secondary/10 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Text List */}
        <div className="space-y-4">
          <ListSkeleton count={4} />
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-10 bg-text-secondary/10 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
