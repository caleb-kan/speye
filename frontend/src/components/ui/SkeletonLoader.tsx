export function SkeletonLoader({
  className = 'h-12 rounded-lg',
}: {
  className?: string
}) {
  return <div className={`${className} bg-text-secondary/10 animate-pulse`} />
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-3 mb-6">
      <SkeletonLoader className="h-8 w-48 rounded-lg" />
      <SkeletonLoader className="h-4 w-96 rounded-lg" />
    </div>
  )
}

export function CardGridSkeleton({
  count = 4,
  columns = 4,
  height = 'h-32',
}: {
  count?: number
  columns?: number
  height?: string
}) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} className={`${height} rounded-2xl`} />
      ))}
    </div>
  )
}

export function ListSkeleton({
  count = 4,
  compact = false,
}: {
  count?: number
  compact?: boolean
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLoader
            className={
              compact ? 'h-8 w-full rounded-lg' : 'h-12 w-full rounded-lg'
            }
          />
          {!compact && (
            <>
              <SkeletonLoader className="h-3 w-2/3 rounded-lg" />
              <SkeletonLoader className="h-3 w-1/3 rounded-lg" />
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLoader className="h-4 w-24 rounded-lg" />
          <SkeletonLoader className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <SkeletonLoader className="h-10 w-full rounded-lg mt-6" />
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <div className="space-y-4">
        <SkeletonLoader className="h-6 w-40 rounded-lg" />
        <ListSkeleton count={3} />
      </div>
      <div className="space-y-4">
        <SkeletonLoader className="h-6 w-40 rounded-lg" />
        <CardGridSkeleton count={4} columns={2} height="h-40" />
      </div>
    </div>
  )
}
