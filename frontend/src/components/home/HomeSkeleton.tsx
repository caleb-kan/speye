/**
 * Home page skeleton loading state
 * Matches the layout of the home reading session
 */
import { SkeletonLoader } from '../ui/SkeletonLoader'

export function HomeSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full px-4 sm:px-8 py-6">
      <div className="w-full max-w-4xl space-y-8">
        <SkeletonLoader className="h-8 w-2/3 rounded-lg mx-auto" />

        <div className="flex gap-6 flex-wrap justify-center">
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
        </div>

        <div className="space-y-4">
          <SkeletonLoader className="h-6 w-full rounded-lg" />
          <SkeletonLoader className="h-6 w-full rounded-lg" />
          <SkeletonLoader className="h-6 w-4/5 rounded-lg" />
          <SkeletonLoader className="h-6 w-full rounded-lg" />
        </div>

        <div className="flex gap-3 justify-center">
          <SkeletonLoader className="h-10 w-24 rounded-lg" />
          <SkeletonLoader className="h-10 w-32 rounded-lg" />
          <SkeletonLoader className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
