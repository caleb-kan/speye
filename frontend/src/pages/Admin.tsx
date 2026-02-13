import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAdminApprovals } from '../hooks/useAdminApprovals'
import { useAutoClearMessage } from '../hooks/useAutoClearMessage'
import { ApprovalsList } from '../components/admin/ApprovalsList'
import { EmptyState } from '../components/admin/EmptyState'
import { AlertMessages } from '../components/ui/AlertMessages'
import { TextPreviewModal } from '../components/admin/TextPreviewModal'
import { QuizPreviewModal } from '../components/admin/QuizPreviewModal'
import { AccessDenied } from '../components/admin/AccessDenied'
import { SUCCESS_MESSAGE_DURATION_MS } from '../constants/ui'
import type { AdminReviewText } from '../services/adminService'

export function Admin() {
  const { loading: authLoading } = useAuth()
  const [initialShowReject, setInitialShowReject] = useState(false)

  const {
    approvals,
    loading,
    error,
    successMessage,
    processing,
    selectedText,
    quizPreviewText,
    isAdmin,
    setSelectedText,
    setQuizPreviewText,
    setSuccessMessage,
    handleApprove,
    handleReject,
    handleRegenerate,
  } = useAdminApprovals()

  useAutoClearMessage(
    successMessage,
    setSuccessMessage,
    SUCCESS_MESSAGE_DURATION_MS
  )

  const handleRejectFromCard = useCallback(
    (text: AdminReviewText) => {
      setSelectedText(text)
      setInitialShowReject(true)
    },
    [setSelectedText]
  )

  const handleCloseModal = useCallback(() => {
    setSelectedText(null)
    setInitialShowReject(false)
  }, [setSelectedText])

  const handleViewText = useCallback(
    (text: AdminReviewText) => {
      setSelectedText(text)
      setInitialShowReject(false)
    },
    [setSelectedText]
  )

  const handleCloseQuizPreview = useCallback(() => {
    setQuizPreviewText(null)
  }, [setQuizPreviewText])

  // Gate entire page behind auth + admin check
  if (authLoading || loading) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="max-w-6xl mx-auto">
          <p className="text-text-secondary animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-6 h-full overflow-auto">
        <AccessDenied />
      </div>
    )
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text mb-2">Admin Panel</h1>
          <p className="text-text-secondary">
            Review text uploads awaiting approval
          </p>
        </div>

        <AlertMessages successMessage={successMessage} errorMessage={error} />

        {!error &&
          (approvals.length === 0 ? (
            <EmptyState
              title="All caught up!"
              message="No texts are currently pending review."
            />
          ) : (
            <ApprovalsList
              approvals={approvals}
              processing={processing}
              onView={handleViewText}
              onViewQuiz={setQuizPreviewText}
              onApprove={handleApprove}
              onReject={handleRejectFromCard}
              onRegenerate={handleRegenerate}
            />
          ))}

        <TextPreviewModal
          text={selectedText}
          processing={processing}
          initialShowReject={initialShowReject}
          onClose={handleCloseModal}
          onApprove={handleApprove}
          onReject={handleReject}
          onRegenerate={handleRegenerate}
        />

        <QuizPreviewModal
          quiz={quizPreviewText?.quiz ?? null}
          title={quizPreviewText?.title ?? null}
          onClose={handleCloseQuizPreview}
        />
      </div>
    </div>
  )
}
