import {
  CardGridSkeleton,
  HeaderSkeleton,
  ListSkeleton,
} from '../ui/SkeletonLoader'

export function AdminSkeleton() {
  return (
    <div className="p-6 flex-1 flex flex-col">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <HeaderSkeleton />

        {/* Stats Grid */}
        <div className="space-y-4">
          <CardGridSkeleton count={4} columns={4} height="h-24" />
        </div>

        {/* Graph Section */}
        <div className="space-y-4">
          <div className="h-6 w-40 bg-text-secondary/10 rounded-lg animate-pulse" />
          <div className="h-64 w-full bg-text-secondary/10 rounded-2xl animate-pulse" />
        </div>

        {/* Pending Reviews Section */}
        <div className="space-y-4">
          <div className="h-6 w-40 bg-text-secondary/10 rounded-lg animate-pulse" />
          <ListSkeleton count={3} />
        </div>
      </div>
    </div>
  )
}
