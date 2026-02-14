import type { ReactNode } from 'react'
import { CheckCircle } from 'lucide-react'

interface EmptyStateProps {
  title: string
  message: string
  icon?: ReactNode
}

export function EmptyState({ title, message, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon ?? <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />}
      <h2 className="text-xl font-semibold text-text mb-2">{title}</h2>
      <p className="text-text-secondary">{message}</p>
    </div>
  )
}
