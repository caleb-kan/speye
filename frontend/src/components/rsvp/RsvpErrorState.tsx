import { RsvpShell, type RsvpOptionsBarProps } from './RsvpShell'

export type RsvpErrorStateProps = {
  optionsBarProps: RsvpOptionsBarProps
  message: string
  onRetry: () => void
}

export function RsvpErrorState({
  optionsBarProps,
  message,
  onRetry,
}: RsvpErrorStateProps) {
  return (
    <RsvpShell
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
    </RsvpShell>
  )
}
