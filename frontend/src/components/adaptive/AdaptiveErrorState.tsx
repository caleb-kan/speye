import { AdaptiveShell, type AdaptiveOptionsBarProps } from './AdaptiveShell'

export type AdaptiveErrorStateProps = {
  optionsBarProps: AdaptiveOptionsBarProps
  message: string
  onRetry: () => void
}

export function AdaptiveErrorState({
  optionsBarProps,
  message,
  onRetry,
}: AdaptiveErrorStateProps) {
  return (
    <AdaptiveShell
      optionsBarProps={optionsBarProps}
      contentClassName="flex-1 flex items-center justify-center"
    >
      <div className="text-center max-w-md">
        <p className="text-error mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-bg rounded hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </AdaptiveShell>
  )
}
