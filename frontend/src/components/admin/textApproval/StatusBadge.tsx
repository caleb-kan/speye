import type { ReactNode } from 'react'
import type { ReviewStatusInfo } from '../../../utils/adminReviewStatus.ts'

interface StatusBadgeProps {
  reviewStatus: ReviewStatusInfo
  icon?: ReactNode
}

export function StatusBadge({ reviewStatus, icon }: StatusBadgeProps) {
  return (
    <span
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${reviewStatus.badgeClass}`}
    >
      {icon}
      {reviewStatus.label}
    </span>
  )
}
