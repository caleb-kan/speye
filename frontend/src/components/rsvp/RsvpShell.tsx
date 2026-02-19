import type { ComponentProps, ReactNode } from 'react'
import { OptionsBar } from '../OptionsBar'

export type RsvpOptionsBarProps = ComponentProps<typeof OptionsBar>

export type RsvpShellProps = {
  optionsBarProps: RsvpOptionsBarProps
  children: ReactNode
  contentClassName?: string
}

export function RsvpShell({
  optionsBarProps,
  children,
  contentClassName,
}: RsvpShellProps) {
  return (
    <div className="flex-1 flex flex-col">
      <OptionsBar {...optionsBarProps} />
      <div className={contentClassName ?? 'flex-1'}>{children}</div>
    </div>
  )
}
