import { CircleHelp } from 'lucide-react'

type InfoTooltipProps = {
  text: string
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex items-center group">
      <CircleHelp
        size={14}
        tabIndex={0}
        className="text-text-secondary cursor-default focus:outline-none"
        aria-label={text}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 rounded bg-bg-secondary px-3 py-2 text-xs text-text shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 z-50"
      >
        {text}
      </span>
    </span>
  )
}
