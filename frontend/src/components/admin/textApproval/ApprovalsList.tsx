import { ApprovalItem } from './ApprovalItem.tsx'
import type { AdminReviewText } from '../../../services/adminService.ts'
import { Layers } from 'lucide-react'

export interface ApprovalsListProps {
  approvals: AdminReviewText[]
  processing: string | null
  onView: (text: AdminReviewText) => void
  onViewQuiz: (text: AdminReviewText) => void
  onApprove: (textId: string) => void
  onReject: (text: AdminReviewText) => void
  onRegenerate: (textId: string) => void
}

export function ApprovalsList(props: ApprovalsListProps) {
  const { approvals, ...itemProps } = props

  return (
    <div className="bg-bg-secondary/30 border border-white/5 rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
            <Layers size={16} />
          </div>
          <h2 className="font-semibold text-text">Pending Reviews</h2>
        </div>
        <span className="text-xs font-mono text-text-secondary bg-white/5 px-2 py-1 rounded-full">
          {approvals.length} Pending
        </span>
      </div>

      {/* Scrollable List Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-3 custom-scrollbar">
        {approvals.map((text) => (
          <ApprovalItem key={text.id} {...itemProps} text={text} />
        ))}
      </div>
    </div>
  )
}
