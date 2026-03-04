type NavTooltipProps = {
  label: string
  isMobile: boolean
}

export function NavTooltip({ label, isMobile }: NavTooltipProps) {
  return (
    <span
      aria-hidden="true"
      className={`
        pointer-events-none absolute whitespace-nowrap
        rounded bg-bg-secondary px-2 py-1 text-xs font-normal tracking-normal text-text shadow-lg
        opacity-0 transition-opacity group-hover:opacity-100
        ${isMobile ? 'left-1/2 -translate-x-1/2 top-full mt-2' : 'left-full top-1/2 -translate-y-1/2 ml-3'}
      `}
    >
      {label}
    </span>
  )
}
