import { AdaptiveShell, type AdaptiveOptionsBarProps } from './AdaptiveShell'
import { SkeletonLoader } from '../ui/SkeletonLoader'

export type AdaptiveTextLoadingSProps = {
  optionsBarProps: AdaptiveOptionsBarProps
}

export function AdaptiveTextLoadingSkeleton({
  optionsBarProps,
}: AdaptiveTextLoadingSProps) {
  return (
    <AdaptiveShell
      optionsBarProps={optionsBarProps}
      contentClassName="flex-1 flex flex-col items-center justify-center"
    >
      <div className="w-full max-w-3xl px-6 space-y-8">
        {/* Title */}
        <SkeletonLoader className="h-8 w-2/3 rounded-lg" />

        {/* Metadata */}
        <div className="flex gap-6 flex-wrap">
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
        </div>

        {/* Reading content placeholder */}
        <div className="space-y-4">
          <SkeletonLoader className="h-6 w-full rounded-lg" />
          <SkeletonLoader className="h-6 w-full rounded-lg" />
          <SkeletonLoader className="h-6 w-4/5 rounded-lg" />
          <SkeletonLoader className="h-6 w-full rounded-lg" />
        </div>

        {/* Controls placeholder */}
        <div className="flex gap-3">
          <SkeletonLoader className="h-10 w-24 rounded-lg" />
          <SkeletonLoader className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </AdaptiveShell>
  )
}
