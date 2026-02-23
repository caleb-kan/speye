import type { AdminReviewText } from '../../../services/adminService.ts'
import {
  Check,
  Eye,
  X,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Clock,
  FileQuestion,
} from 'lucide-react'
import { formatDate } from '../../../utils/formatDate.ts'
import { getReviewStatus } from '../../../utils/adminReviewStatus.ts'
import { truncateText } from '../../../utils/truncateText.ts'
import { StatusBadge } from './StatusBadge.tsx'
import {
  UNTITLED_TEXT_FALLBACK,
  ADMIN_TEXT_PREVIEW_LENGTH,
} from '../../../constants/admin.ts'

interface ApprovalItemProps {
  text: AdminReviewText
  processing: string | null
  onView: (text: AdminReviewText) => void
  onViewQuiz: (text: AdminReviewText) => void
  onApprove: (textId: string) => void
  onReject: (text: AdminReviewText) => void
  onDelete: (textId: string) => void
  onRegenerate: (textId: string) => void
}

export function ApprovalItem({
  text,
  processing,
  onView,
  onViewQuiz,
  onApprove,
  onReject,
  onDelete,
  onRegenerate,
}: ApprovalItemProps) {
  const reviewStatus = getReviewStatus(text)
  const isProcessing = processing === text.id
  const preview = truncateText(text.content, ADMIN_TEXT_PREVIEW_LENGTH)

  const statusIcon = reviewStatus.isFailure ? (
    <AlertTriangle size={12} />
  ) : (
    <Clock size={12} />
  )

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-transparent hover:bg-white/5 transition-all gap-4">
      {/* Left: Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-semibold text-text text-sm truncate">
            {text.title || UNTITLED_TEXT_FALLBACK}
          </h3>
          <StatusBadge reviewStatus={reviewStatus} icon={statusIcon} />
        </div>

        <div className="text-xs text-text-secondary mb-1.5 flex items-center gap-2">
          <span>{formatDate(text.uploaded_at)}</span>
          <span className="w-1 h-1 rounded-full bg-white/20"></span>
          {text.owner_username && (
            <>
              <span>{text.owner_username}</span>
              <span className="w-1 h-1 rounded-full bg-white/20"></span>
            </>
          )}
          <span className="uppercase tracking-wide text-[10px]">
            {text.processing_status}
          </span>
        </div>

        <p className="text-sm text-text-secondary/70 truncate pr-4">
          {text.rejection_reason ? (
            <span className="text-error font-medium">
              Reason: {text.rejection_reason}
            </span>
          ) : (
            preview
          )}
        </p>
      </div>

      {/* Right: Actions */}
      <div
        className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        aria-busy={isProcessing}
      >
        <button
          onClick={() => onView(text)}
          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
          title="View details"
        >
          <Eye size={16} />
        </button>

        {text.quiz && (
          <button
            onClick={() => onViewQuiz(text)}
            className="p-2 text-text-secondary hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
            title="View quiz"
          >
            <FileQuestion size={16} />
          </button>
        )}

        {(reviewStatus.canApprove ||
          reviewStatus.canReject ||
          reviewStatus.canDelete ||
          reviewStatus.canRegenerate) && (
          <div className="w-px h-4 bg-white/10 mx-1"></div>
        )}

        {reviewStatus.canApprove && (
          <button
            onClick={() => onApprove(text.id)}
            disabled={isProcessing}
            className="p-2 text-text-secondary hover:text-success hover:bg-success/10 rounded-lg transition-colors"
            title="Approve"
          >
            <Check size={16} />
          </button>
        )}

        {reviewStatus.canReject && (
          <button
            onClick={() => onReject(text)}
            disabled={isProcessing}
            className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
            title="Reject"
          >
            <X size={16} />
          </button>
        )}

        {reviewStatus.canDelete && (
          <button
            onClick={() => onDelete(text.id)}
            disabled={isProcessing}
            className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        )}

        {reviewStatus.canRegenerate && (
          <button
            onClick={() => onRegenerate(text.id)}
            disabled={isProcessing}
            className="p-2 text-text-secondary hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
            title="Regenerate"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
