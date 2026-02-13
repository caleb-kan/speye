import { ApprovalItem } from './ApprovalItem'
import type { AdminReviewText } from '../../services/adminService'

export interface ApprovalsListProps {
  approvals: AdminReviewText[]
  processing: string | null
  onView: (text: AdminReviewText) => void
  onViewQuiz: (text: AdminReviewText) => void
  onApprove: (textId: string) => void
  onReject: (text: AdminReviewText) => void
  onRegenerate: (textId: string) => void
}

export function ApprovalsList({
  approvals,
  processing,
  onView,
  onViewQuiz,
  onApprove,
  onReject,
  onRegenerate,
}: ApprovalsListProps) {
  return (
    <div className="space-y-4">
      {approvals.map((text) => (
        <ApprovalItem
          key={text.id}
          text={text}
          processing={processing}
          onView={onView}
          onViewQuiz={onViewQuiz}
          onApprove={onApprove}
          onReject={onReject}
          onRegenerate={onRegenerate}
        />
      ))}
    </div>
  )
}
