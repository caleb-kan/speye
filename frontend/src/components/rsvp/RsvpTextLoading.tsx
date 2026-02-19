import { Loader2 } from 'lucide-react'
import { RsvpShell, type RsvpOptionsBarProps } from './RsvpShell'

export type RsvpTextLoadingProps = {
  optionsBarProps: RsvpOptionsBarProps
}

export function RsvpTextLoading({ optionsBarProps }: RsvpTextLoadingProps) {
  return (
    <RsvpShell
      optionsBarProps={optionsBarProps}
      contentClassName="flex-1 flex items-center justify-center"
    >
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Loading texts...</p>
      </div>
    </RsvpShell>
  )
}
