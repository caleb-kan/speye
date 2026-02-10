import type { ComponentProps, ReactNode } from 'react'
import { OptionsBar } from '../OptionsBar'

export type AdaptiveOptionsBarProps = ComponentProps<typeof OptionsBar>

export type AdaptiveShellProps = {
  optionsBarProps: AdaptiveOptionsBarProps
  children: ReactNode
  contentClassName?: string
}

export function AdaptiveShell({
  optionsBarProps,
  children,
  contentClassName,
}: AdaptiveShellProps) {
  return (
    <div className="flex-1 flex flex-col">
      <OptionsBar {...optionsBarProps} />
      <div className={contentClassName ?? 'flex-1'}>{children}</div>
    </div>
  )
}
