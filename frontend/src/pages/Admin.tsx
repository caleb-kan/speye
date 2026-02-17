import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAdminApprovals } from '../hooks/useAdminApprovals'
import { useAdminStats } from '../hooks/useAdminStats'
import { useAutoClearMessage } from '../hooks/useAutoClearMessage'
import { ApprovalsList } from '../components/admin/textApproval/ApprovalsList'
import { AlertMessages } from '../components/ui/AlertMessages'
import { TextPreviewModal } from '../components/admin/textApproval/TextPreviewModal'
import { QuizPreviewModal } from '../components/admin/textApproval/QuizPreviewModal'
import { AccessDenied } from '../components/admin/textApproval/AccessDenied'
import { AdminGraphCard } from '../components/admin/AdminGraphCard'
import { AdminStatsCard } from '../components/admin/AdminStatsCard'
import { AdminActionPanel } from '../components/admin/AdminActionPanel'
import { SUCCESS_MESSAGE_DURATION_MS } from '../constants/ui'
import type { AdminReviewText } from '../services/adminService'
import { FileText, XCircle, CheckCircle2 } from 'lucide-react'

export function Admin() {
  const { loading: authLoading } = useAuth()
  const [initialShowReject, setInitialShowReject] = useState(false)

  const {
    stats,
    trend,
    loading: statsLoading,
    error: statsError,
  } = useAdminStats()

  const {
    approvals,
    loading: approvalsLoading,
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

  if (authLoading || statsLoading || approvalsLoading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-text-secondary animate-pulse">
          Loading dashboard...
        </p>
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

  // Global Stats (+ fallback if stats fail to load)
  const displayStats = stats ?? {
    totalTexts: 0,
    publicTexts: 0,
    privateTexts: 0,
    pendingTexts: approvals.length,
    activeUsers: 0,
    rejectionRate: '-',
  }

  const activeUsersTotal = stats ? stats.activeUsers : '-'
  const rejectionRate = stats ? stats.rejectionRate : '-'

  return (
    <div className="p-6 h-full overflow-y-auto bg-bg">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div>
            <h1 className="text-2xl font-bold text-text mb-1">Admin Panel</h1>
            <p className="text-text-secondary text-xs">
              Overview of content moderation and system activity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
              [{activeUsersTotal}] Active Users
            </span>
          </div>
        </div>

        <AlertMessages
          successMessage={successMessage}
          errorMessage={error || statsError}
        />

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard
            title="Total Texts"
            value={displayStats.totalTexts}
            icon={<FileText size={18} />}
            split={[
              {
                label: 'Public',
                value: displayStats.publicTexts,
                color: 'bg-primary',
              },
              {
                label: 'Private',
                value: displayStats.privateTexts,
                color: 'bg-purple-500/50',
              },
            ]}
          />

          <div className="sm:col-span-2">
            <AdminGraphCard
              title="Active Users (30d)"
              total={activeUsersTotal}
              data={trend}
              className="p-6 h-full"
            />
          </div>

          <AdminStatsCard
            title="Rejection Rate"
            value={rejectionRate}
            icon={<XCircle size={18} />}
            trendUp={true}
            className="p-4"
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Approval Queue (Left Column) */}
          <div className="lg:col-span-3 h-[500px] lg:h-[60vh] flex flex-col">
            {approvals.length === 0 ? (
              <div className="bg-bg-secondary/30 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center flex-1 h-full">
                <CheckCircle2 className="w-12 h-12 text-success/50 mb-3" />
                <h2 className="text-lg font-semibold text-text mb-1">
                  All caught up!
                </h2>
                <p className="text-text-secondary text-sm">
                  No texts are currently pending review.
                </p>
              </div>
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
            )}
          </div>

          {/* Action Panel (Right Column) */}
          <div className="lg:col-span-1 h-[500px] lg:h-[60vh]">
            <AdminActionPanel />
          </div>
        </div>

        {/* Modals */}
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
