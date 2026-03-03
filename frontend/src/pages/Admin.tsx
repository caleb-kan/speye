import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAdminApprovals } from '../hooks/useAdminApprovals'
import { useAdminStats } from '../hooks/useAdminStats'
import { useAutoClearMessage } from '../hooks/useAutoClearMessage'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { ApprovalsList } from '../components/admin/textApproval/ApprovalsList'
import { AlertMessages } from '../components/ui/AlertMessages'
import { TextPreviewModal } from '../components/admin/textApproval/TextPreviewModal'
import { QuizPreviewModal } from '../components/admin/textApproval/QuizPreviewModal'
import { AccessDenied } from '../components/admin/textApproval/AccessDenied'

import {
  AdminMetricsWidget,
  type ChartMetric,
} from '../components/admin/AdminMetricsWidget'
import { AdminWpmDistributionWidget } from '../components/admin/AdminWpmDistributionWidget'
import { AdminStatsCard } from '../components/admin/AdminStatsCard'
import { AdminActionPanel } from '../components/admin/AdminActionPanel'
import { AdminSkeleton } from '../components/admin/AdminSkeleton'
import { SUCCESS_MESSAGE_DURATION_MS } from '../constants/ui'
import type { AdminReviewText } from '../services/adminService'
import {
  FileText,
  XCircle,
  CheckCircle2,
  CloudOff,
  Users,
  Target,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const WIDGET_ROW_BASE_CLASS =
  'col-start-1 row-start-1 grid grid-cols-1 lg:grid-cols-3 gap-4 w-full h-[336px] lg:h-[160px] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]'

const WIDGET_TRANSITION_CLASS =
  'transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]'

export function Admin() {
  const { loading: authLoading } = useAuth()
  const { isOnline } = useNetworkStatus()
  const [initialShowReject, setInitialShowReject] = useState(false)

  const [viewMode, setViewMode] = useState<'collapsed' | 'expanded'>(
    'collapsed'
  )
  const [activePage, setActivePage] = useState<0 | 1>(0)

  const {
    stats,
    trend,
    quizStats,
    wpmStats,
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
    handleDelete,
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

  const displayStats = stats ?? {
    totalTexts: 0,
    publicTexts: 0,
    privateTexts: 0,
    pendingTexts: approvals.length,
    activeUsers: 0,
    rejectionRate: '-',
  }

  const chartMetrics: ChartMetric[] = useMemo(() => {
    const globalAcc = quizStats?.global_avg_accuracy
      ? `${quizStats.global_avg_accuracy}%`
      : '0%'
    const totalQuizzes = quizStats?.total_quizzes_taken
      ? quizStats.total_quizzes_taken.toLocaleString()
      : '0'

    return [
      {
        id: 'active_users',
        title: 'Active Users',
        subtitle: 'Last 30 Days',
        total: displayStats.activeUsers || '-',
        icon: <Users size={14} />,
        color: 'var(--color-primary)',
        valueLabel: 'active',
        data: trend.map((d) => ({
          dateStr: d.activity_date,
          value: d.active_count,
        })),
      },
      {
        id: 'quiz_accuracy',
        title: 'Quiz Accuracy',
        subtitle: `Global Avg • ${totalQuizzes} Quizzes Taken`,
        total: globalAcc,
        icon: <Target size={14} />,
        color: 'var(--color-success)',
        valueLabel: 'accuracy',
        valueFormatter: (val: number) => `${val}%`,
        data: (quizStats?.trend ?? [])
          .filter((d) => d.avg_accuracy !== null)
          .map((d) => ({
            dateStr: d.date,
            value: d.avg_accuracy!,
          })),
      },
    ]
  }, [trend, displayStats.activeUsers, quizStats])

  if (authLoading || statsLoading || approvalsLoading) return <AdminSkeleton />
  if (!isAdmin)
    return (
      <div className="p-6">
        <AccessDenied />
      </div>
    )

  if (!isOnline) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center gap-3">
        <CloudOff className="w-12 h-12 text-text-secondary/50" />
        <h2 className="text-lg font-semibold text-text">
          Admin panel unavailable offline
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          Content moderation requires an internet connection. Please reconnect.
        </p>
      </div>
    )
  }

  const pageVisibilityClass = (page: 0 | 1) =>
    viewMode === 'collapsed' && activePage !== page
      ? 'opacity-0 translate-y-2 blur-[2px] pointer-events-none z-0'
      : 'opacity-100 translate-y-0 blur-0 z-10'

  return (
    <div className="p-4 sm:p-6 pb-4 bg-bg flex flex-col h-full min-h-0">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0 gap-3">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pt-1 pb-1 shrink-0">
          <div className="mt-1">
            <h1 className="text-2xl font-bold text-text mb-1 tracking-tight">
              Admin Panel
            </h1>
            <p className="text-text-secondary text-xs">
              Overview of content moderation and system activity
            </p>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <div className="flex items-center gap-2 pr-1">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_var(--color-success)]"></div>
              <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
                [{stats?.activeUsers ?? '-'}] Active Users
              </span>
            </div>

            <div className="flex items-center bg-bg-secondary/40 backdrop-blur-xl p-1 rounded-xl border border-text-secondary/10 shadow-sm ring-1 ring-white/5">
              <div
                className={`flex items-center transition-all duration-300 overflow-hidden ${viewMode === 'expanded' ? 'w-0 opacity-0' : 'w-auto opacity-100 pr-1.5'}`}
              >
                <button
                  onClick={() => setActivePage(0)}
                  className={`p-1 rounded-lg transition-all duration-300 ${activePage === 0 ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-text-secondary/10'}`}
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
                <div className="flex gap-2 px-2.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${activePage === 0 ? 'bg-primary scale-125' : 'bg-text-secondary/30'}`}
                  />
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${activePage === 1 ? 'bg-primary scale-125' : 'bg-text-secondary/30'}`}
                  />
                </div>
                <button
                  onClick={() => setActivePage(1)}
                  className={`p-1 rounded-lg transition-all duration-300 ${activePage === 1 ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-text-secondary/10'}`}
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
                <div className="w-px h-4 bg-text-secondary/20 ml-2" />
              </div>

              <button
                onClick={() =>
                  setViewMode((prev) =>
                    prev === 'collapsed' ? 'expanded' : 'collapsed'
                  )
                }
                className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text hover:bg-text-secondary/10 rounded-lg transition-all"
              >
                {viewMode === 'collapsed' ? (
                  <Maximize2 size={12} strokeWidth={2.5} />
                ) : (
                  <Minimize2 size={12} strokeWidth={2.5} />
                )}
                {viewMode === 'collapsed' ? 'Expand Layout' : 'Collapse'}
              </button>
            </div>
          </div>
        </div>

        {(successMessage || error || statsError) && (
          <div className="shrink-0">
            <AlertMessages
              successMessage={successMessage}
              errorMessage={error || statsError}
            />
          </div>
        )}

        {/* Widgets Grid */}
        <div className="relative w-full z-10 shrink-0">
          <div className="grid grid-cols-1">
            <div
              className={`${WIDGET_ROW_BASE_CLASS} ${pageVisibilityClass(0)}`}
            >
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
                    color: 'bg-text-secondary/50',
                  },
                ]}
                className="lg:col-span-1 h-[160px]"
              />
              <div className="lg:col-span-2 h-[160px]">
                <AdminMetricsWidget metrics={chartMetrics} className="h-full" />
              </div>
            </div>

            <div
              className={`${WIDGET_ROW_BASE_CLASS} ${viewMode === 'expanded' ? 'translate-y-[352px] lg:translate-y-[176px]' : 'translate-y-0'} ${pageVisibilityClass(1)}`}
            >
              <div className="lg:col-span-2 h-[160px]">
                <AdminWpmDistributionWidget
                  data={wpmStats}
                  className="h-full"
                />
              </div>
              <AdminStatsCard
                title="Rejection Rate"
                value={displayStats.rejectionRate}
                icon={<XCircle size={18} />}
                className="lg:col-span-1 h-[160px]"
              />
            </div>
          </div>

          <div
            className={`w-full ${WIDGET_TRANSITION_CLASS} ${viewMode === 'expanded' ? 'h-[352px] lg:h-[176px]' : 'h-0'}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start pt-2 flex-1 min-h-0">
          <div className="lg:col-span-3 flex flex-col relative z-20 h-full w-full min-h-0 overflow-hidden">
            {approvals.length === 0 ? (
              <div className="bg-bg-secondary/30 border border-text-secondary/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center flex-1 h-full shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-success/50 mb-3" />
                <h2 className="text-lg font-semibold text-text mb-1">
                  All caught up!
                </h2>
                <p className="text-text-secondary text-sm">
                  No texts are currently pending review.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden rounded-2xl">
                <ApprovalsList
                  approvals={approvals}
                  processing={processing}
                  onView={handleViewText}
                  onViewQuiz={setQuizPreviewText}
                  onApprove={handleApprove}
                  onReject={handleRejectFromCard}
                  onDelete={handleDelete}
                  onRegenerate={handleRegenerate}
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-1 flex flex-col relative z-20 h-full w-full min-h-0 overflow-hidden">
            <AdminActionPanel />
          </div>
        </div>

        <TextPreviewModal
          text={selectedText}
          processing={processing}
          initialShowReject={initialShowReject}
          onClose={handleCloseModal}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelete={handleDelete}
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
