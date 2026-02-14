import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAdminApprovals } from '../hooks/useAdminApprovals'
import { useAutoClearMessage } from '../hooks/useAutoClearMessage'
import { ApprovalsList } from '../components/admin/textApproval/ApprovalsList.tsx'
import { EmptyState } from '../components/admin/textApproval/EmptyState.tsx'
import { AlertMessages } from '../components/ui/AlertMessages'
import { TextPreviewModal } from '../components/admin/textApproval/TextPreviewModal.tsx'
import { QuizPreviewModal } from '../components/admin/textApproval/QuizPreviewModal.tsx'
import { AccessDenied } from '../components/admin/textApproval/AccessDenied.tsx'
import { NotificationCreator } from '../components/admin/notificationCreator/NotificationCreator.tsx'
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
    <div className="p-6 h-full overflow-hidden flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="mb-4 shrink-0">
          <h1 className="text-3xl font-bold text-text mb-1">Admin Panel</h1>
          <p className="text-text-secondary text-sm">
            Manage text approvals and send notifications
          </p>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Text Approvals Section */}
          <section className="border border-border rounded-lg p-6 flex-1 min-w-0 flex flex-col overflow-hidden">
            <h2 className="text-xl font-semibold text-text mb-4 shrink-0">
              Text Approvals
            </h2>

            <div className="shrink-0">
              <AlertMessages
                successMessage={successMessage}
                errorMessage={error}
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
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
            </div>
          </section>

          {/* Send Notification Section */}
          <section className="border border-border rounded-lg p-6 w-96 shrink-0 overflow-y-auto">
            <h2 className="text-xl font-semibold text-text mb-4">
              Send Notification
            </h2>
            <NotificationCreator />
          </section>
        </div>

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
