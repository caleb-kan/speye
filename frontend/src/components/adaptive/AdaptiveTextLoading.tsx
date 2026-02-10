import { Loader2 } from 'lucide-react'
import { AdaptiveShell, type AdaptiveOptionsBarProps } from './AdaptiveShell'

export type AdaptiveTextLoadingProps = {
  optionsBarProps: AdaptiveOptionsBarProps
}

export function AdaptiveTextLoading({
  optionsBarProps,
}: AdaptiveTextLoadingProps) {
  return (
    <AdaptiveShell
      optionsBarProps={optionsBarProps}
      contentClassName="flex-1 flex items-center justify-center"
    >
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Loading texts...</p>
      </div>
    </AdaptiveShell>
  )
}
