import type { ReactNode } from 'react'
import { AdaptiveShell, type AdaptiveOptionsBarProps } from './AdaptiveShell'

export type AdaptiveReaderLayoutProps = {
  optionsBarProps: AdaptiveOptionsBarProps
  children: ReactNode
}

export function AdaptiveReaderLayout({
  optionsBarProps,
  children,
}: AdaptiveReaderLayoutProps) {
  return (
    <AdaptiveShell
      optionsBarProps={optionsBarProps}
      contentClassName="flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      {children}
    </AdaptiveShell>
  )
}
