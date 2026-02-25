export function ActivitySkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center w-full px-8 py-10">
      <div className="w-full max-w-5xl animate-pulse space-y-8">
        <div className="h-8 w-48 bg-text-secondary/10 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-text-secondary/10 rounded-3xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-20 bg-text-secondary/10 rounded-2xl" />
          <div className="h-20 bg-text-secondary/10 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
