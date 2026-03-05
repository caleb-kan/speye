import {
  CardGridSkeleton,
  HeaderSkeleton,
  ListSkeleton,
  SkeletonLoader,
} from '../ui/SkeletonLoader'

export function AdminSkeleton() {
  return (
    <div className="p-6 flex-1 flex flex-col">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        <HeaderSkeleton />

        {/* Stats Grid */}
        <div className="space-y-4">
          <CardGridSkeleton count={4} columns={4} height="h-24" />
        </div>

        {/* Graph Section */}
        <div className="space-y-4">
          <SkeletonLoader className="h-6 w-40 rounded-lg" />
          <SkeletonLoader className="h-64 w-full rounded-2xl" />
        </div>

        {/* Pending Reviews Section */}
        <div className="space-y-4">
          <SkeletonLoader className="h-6 w-40 rounded-lg" />
          <ListSkeleton count={3} />
        </div>
      </div>
    </div>
  )
}
