import type { AdminReviewText } from '../../services/adminService'
import {
  Check,
  Eye,
  X,
  AlertTriangle,
  RefreshCw,
  Clock,
  FileQuestion,
} from 'lucide-react'
import { formatDate } from '../../utils/formatDate'
import { getReviewStatus } from '../../utils/adminReviewStatus'
import { truncateText } from '../../utils/truncateText'
import { StatusBadge } from './StatusBadge'
import {
  ADMIN_TEXT_PREVIEW_LENGTH,
  UNTITLED_TEXT_FALLBACK,
} from '../../constants/admin'

interface ApprovalItemProps {
  text: AdminReviewText
  processing: string | null
  onView: (text: AdminReviewText) => void
  onViewQuiz: (text: AdminReviewText) => void
  onApprove: (textId: string) => void
  onReject: (text: AdminReviewText) => void
  onRegenerate: (textId: string) => void
}

export function ApprovalItem({
  text,
  processing,
  onView,
  onViewQuiz,
  onApprove,
  onReject,
  onRegenerate,
}: ApprovalItemProps) {
  const reviewStatus = getReviewStatus(text)
  const preview = truncateText(text.content, ADMIN_TEXT_PREVIEW_LENGTH)
  const isProcessing = processing === text.id

  const statusIcon = reviewStatus.isFailure ? (
    <AlertTriangle size={12} />
  ) : (
    <Clock size={12} />
  )

  return (
    <div className="bg-bg-secondary rounded-lg p-4 border border-border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-text">
              {text.title || UNTITLED_TEXT_FALLBACK}
            </h3>
            <StatusBadge reviewStatus={reviewStatus} icon={statusIcon} />
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary mb-2">
            <span>{formatDate(text.uploaded_at)}</span>
          </div>
          {text.rejection_reason && (
            <div className="text-sm text-error mb-2">
              Reason: {text.rejection_reason}
            </div>
          )}
          <div className="text-sm text-text mb-3">{preview}</div>
        </div>

        <div className="flex items-center gap-2 ml-4" aria-busy={isProcessing}>
          <button
            type="button"
            onClick={() => onView(text)}
            className="p-2 text-text-secondary hover:text-text hover:bg-bg rounded-lg transition-colors"
            title="View full text"
            aria-label="View full text"
          >
            <Eye size={16} />
          </button>

          {text.quiz && (
            <button
              type="button"
              onClick={() => onViewQuiz(text)}
              className="p-2 text-text-secondary hover:text-text hover:bg-bg rounded-lg transition-colors"
              title="View quiz"
              aria-label="View quiz"
            >
              <FileQuestion size={16} />
            </button>
          )}

          {reviewStatus.canApprove && (
            <button
              type="button"
              onClick={() => onApprove(text.id)}
              disabled={isProcessing}
              className="p-2 text-success hover:opacity-80 hover:bg-success/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={reviewStatus.approveLabel}
              aria-label={reviewStatus.approveLabel}
            >
              <Check size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onReject(text)}
            disabled={isProcessing}
            className="p-2 text-error hover:opacity-80 hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reject"
            aria-label="Reject"
          >
            <X size={16} />
          </button>

          {reviewStatus.canRegenerate && (
            <button
              type="button"
              onClick={() => onRegenerate(text.id)}
              disabled={isProcessing}
              className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={reviewStatus.regenerateLabel}
              aria-label={reviewStatus.regenerateLabel}
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
