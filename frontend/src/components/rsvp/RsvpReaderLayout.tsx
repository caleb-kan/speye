import type { ReactNode } from 'react'
import { RsvpShell, type RsvpOptionsBarProps } from './RsvpShell'
import { useIsMobile } from '../../hooks/useIsMobile'

export type RsvpReaderLayoutProps = {
  optionsBarProps: RsvpOptionsBarProps
  children: ReactNode
  optionsOpen?: boolean
  onOptionsOpenChange?: (open: boolean) => void
}

export function RsvpReaderLayout({
  optionsBarProps,
  children,
  optionsOpen,
  onOptionsOpenChange,
}: RsvpReaderLayoutProps) {
  const isMobile = useIsMobile()
  return (
    <RsvpShell
      optionsBarProps={optionsBarProps}
      contentClassName={
        isMobile
          ? 'flex-1 flex flex-col'
          : 'flex-1 flex flex-col min-h-0 overflow-hidden'
      }
      optionsOpen={optionsOpen}
      onOptionsOpenChange={onOptionsOpenChange}
    >
      {children}
    </RsvpShell>
  )
}
