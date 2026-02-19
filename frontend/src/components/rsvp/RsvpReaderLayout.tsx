import type { ReactNode } from 'react'
import { RsvpShell, type RsvpOptionsBarProps } from './RsvpShell'

export type RsvpReaderLayoutProps = {
  optionsBarProps: RsvpOptionsBarProps
  children: ReactNode
}

export function RsvpReaderLayout({
  optionsBarProps,
  children,
}: RsvpReaderLayoutProps) {
  return (
    <RsvpShell
      optionsBarProps={optionsBarProps}
      contentClassName="flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      {children}
    </RsvpShell>
  )
}
