import { RsvpShell, type RsvpOptionsBarProps } from './RsvpShell'
import { SkeletonLoader } from '../ui/SkeletonLoader'

export type RsvpTextLoadingSkeletonProps = {
  optionsBarProps: RsvpOptionsBarProps
}

export function RsvpTextLoadingSkeleton({
  optionsBarProps,
}: RsvpTextLoadingSkeletonProps) {
  return (
    <RsvpShell
      optionsBarProps={optionsBarProps}
      contentClassName="flex-1 flex flex-col items-center justify-center"
    >
      <div className="w-full max-w-3xl px-6 space-y-8">
        <SkeletonLoader className="h-8 w-2/3 rounded-lg" />

        <div className="flex gap-6 flex-wrap">
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
          <SkeletonLoader className="h-4 w-32 rounded-lg" />
        </div>

        <div className="flex justify-center items-center h-40">
          <SkeletonLoader className="h-24 w-40 rounded-lg" />
        </div>

        <div className="flex gap-3 justify-center">
          <SkeletonLoader className="h-10 w-24 rounded-lg" />
          <SkeletonLoader className="h-10 w-32 rounded-lg" />
          <SkeletonLoader className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </RsvpShell>
  )
}
