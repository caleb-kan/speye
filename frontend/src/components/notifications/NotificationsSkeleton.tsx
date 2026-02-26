import { HeaderSkeleton, ListSkeleton } from '../ui/SkeletonLoader'

export function NotificationsSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center w-full px-4 sm:px-8 py-6">
      <div className="w-full max-w-2xl">
        <HeaderSkeleton />
        <ListSkeleton count={5} />
      </div>
    </div>
  )
}
