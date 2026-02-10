import type { ReactNode } from 'react'

export type SectionShellProps = {
  title: string
  children: ReactNode
}

export function SectionShell({ title, children }: SectionShellProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      {children}
    </div>
  )
}
