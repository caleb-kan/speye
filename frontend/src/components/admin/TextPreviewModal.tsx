import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import type { AdminReviewText } from '../../services/adminService'
import { formatDate } from '../../utils/formatDate'
import { getReviewStatus } from '../../utils/adminReviewStatus'
import { StatusBadge } from './StatusBadge'
import { UNTITLED_TEXT_FALLBACK } from '../../constants/admin'

interface TextPreviewModalProps {
  text: AdminReviewText | null
  processing: string | null
  initialShowReject?: boolean
  onClose: () => void
  onApprove: (textId: string) => void
  onReject: (textId: string, notes?: string) => void
  onRegenerate: (textId: string) => void
}

export function TextPreviewModal({
  text,
  processing,
  initialShowReject = false,
  onClose,
  onApprove,
  onReject,
  onRegenerate,
}: TextPreviewModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionNotes, setRejectionNotes] = useState('')

  useEffect(() => {
    if (!text) {
      // Resetting derived form state when modal closes (text prop becomes null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowRejectForm(false)
      setRejectionNotes('')
    } else if (initialShowReject) {
      // Pre-open rejection form when triggered from card reject button
      setShowRejectForm(true)
      setRejectionNotes('')
    } else {
      // Reset form state when switching between texts
      setShowRejectForm(false)
      setRejectionNotes('')
    }
  }, [text, initialShowReject])

  useEffect(() => {
    if (!text) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [text, onClose])

  if (!text) return null

  const reviewStatus = getReviewStatus(text)
  const isProcessing = processing === text.id

  const handleRejectClick = () => {
    setShowRejectForm(true)
  }

  const handleRejectConfirm = () => {
    onReject(text.id, rejectionNotes.trim() || undefined)
  }

  const handleRejectCancel = () => {
    setShowRejectForm(false)
    setRejectionNotes('')
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="text-preview-title"
    >
      <div className="bg-bg rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-bg border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2
              id="text-preview-title"
              className="text-xl font-semibold text-text"
            >
              {text.title || UNTITLED_TEXT_FALLBACK}
            </h2>
            <StatusBadge reviewStatus={reviewStatus} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4 text-sm text-text-secondary space-y-1">
            <div>Uploaded: {formatDate(text.uploaded_at)}</div>
            <div>
              Processing: {text.processing_status} | Quiz:{' '}
              {text.quiz_valid === null
                ? 'validating'
                : text.quiz_valid
                  ? 'valid'
                  : 'invalid'}
            </div>
            {text.rejection_reason && (
              <div className="text-error">Reason: {text.rejection_reason}</div>
            )}
          </div>

          <div className="mb-4 p-3 bg-bg-secondary rounded-lg text-sm text-text-secondary">
            {reviewStatus.description}
          </div>

          <pre className="whitespace-pre-wrap font-mono text-sm text-text bg-bg-secondary p-4 rounded-lg overflow-auto max-h-96">
            {text.content}
          </pre>

          {showRejectForm && (
            <div className="mt-4 p-4 bg-bg-secondary rounded-lg border border-border">
              <label
                htmlFor="rejection-notes"
                className="block text-sm font-medium text-text mb-2"
              >
                Rejection notes (optional)
              </label>
              <textarea
                id="rejection-notes"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                className="w-full p-2 bg-bg border border-border rounded-lg text-text text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Provide a reason for rejection..."
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleRejectCancel}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-sm bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          <div
            className="mt-6 flex items-center gap-3 justify-end"
            aria-busy={isProcessing}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text transition-colors"
            >
              Cancel
            </button>

            {reviewStatus.canRegenerate && (
              <button
                type="button"
                onClick={() => onRegenerate(text.id)}
                disabled={isProcessing}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RefreshCw size={16} />
                {reviewStatus.regenerateLabel}
              </button>
            )}

            {!showRejectForm && (
              <button
                type="button"
                onClick={handleRejectClick}
                disabled={isProcessing}
                className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            )}

            {reviewStatus.canApprove && (
              <button
                type="button"
                onClick={() => onApprove(text.id)}
                disabled={isProcessing}
                className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewStatus.approveLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
