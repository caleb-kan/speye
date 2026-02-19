import { useState, useMemo } from 'react'
import { ApprovalItem } from './ApprovalItem.tsx'
import type { AdminReviewText } from '../../../services/adminService.ts'
import type { ApprovalFilterTab } from '../../../constants/admin.ts'
import { DEFAULT_APPROVAL_FILTER_TAB } from '../../../constants/admin.ts'
import { AlertTriangle, CheckCircle2, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { isFlaggedForReview } from '../../../utils/adminReviewStatus.ts'

export interface ApprovalsListProps {
  approvals: AdminReviewText[]
  processing: string | null
  onView: (text: AdminReviewText) => void
  onViewQuiz: (text: AdminReviewText) => void
  onApprove: (textId: string) => void
  onReject: (text: AdminReviewText) => void
  onRegenerate: (textId: string) => void
}

type FilterTabConfig = {
  key: ApprovalFilterTab
  label: string
  icon: LucideIcon
  activeClass: string
  badgeActiveClass: string
  emptyIcon: LucideIcon
  emptyIconClass: string
  emptyTitle: string
  emptyDescription: string
}

const FILTER_TABS: FilterTabConfig[] = [
  {
    key: 'flagged',
    label: 'Flagged',
    icon: AlertTriangle,
    activeClass: 'bg-error/20 text-error border border-error/20 shadow-sm',
    badgeActiveClass: 'bg-error/20 text-error',
    emptyIcon: CheckCircle2,
    emptyIconClass: 'text-green-400/60',
    emptyTitle: 'No flagged texts',
    emptyDescription: 'All pending texts passed automated checks.',
  },
  {
    key: 'passed',
    label: 'Passed',
    icon: CheckCircle2,
    activeClass:
      'bg-primary/20 text-primary border border-primary/20 shadow-sm',
    badgeActiveClass: 'bg-primary/20 text-primary',
    emptyIcon: Layers,
    emptyIconClass: 'text-text-secondary/40',
    emptyTitle: 'No passed texts',
    emptyDescription: 'All pending texts have been flagged for review.',
  },
]

const INACTIVE_TAB_CLASS =
  'text-text-secondary hover:text-text hover:bg-white/5 border border-transparent'
const INACTIVE_BADGE_CLASS = 'bg-white/5 text-text-secondary'

export function ApprovalsList(props: ApprovalsListProps) {
  const { approvals, ...itemProps } = props
  const [activeTab, setActiveTab] = useState<ApprovalFilterTab>(
    DEFAULT_APPROVAL_FILTER_TAB
  )

  const { flagged, passed } = useMemo(() => {
    const flagged: AdminReviewText[] = []
    const passed: AdminReviewText[] = []
    for (const text of approvals) {
      ;(isFlaggedForReview(text) ? flagged : passed).push(text)
    }
    return { flagged, passed }
  }, [approvals])

  const counts: Record<ApprovalFilterTab, number> = {
    flagged: flagged.length,
    passed: passed.length,
  }
  const displayedApprovals = activeTab === 'flagged' ? flagged : passed
  const activeConfig = FILTER_TABS.find((t) => t.key === activeTab)!

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

      {/* Filter Tabs */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5">
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  isActive ? tab.activeClass : INACTIVE_TAB_CLASS
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive ? tab.badgeActiveClass : INACTIVE_BADGE_CLASS
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Scrollable List Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-3 custom-scrollbar">
        {displayedApprovals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
            <activeConfig.emptyIcon
              size={32}
              className={`mb-3 ${activeConfig.emptyIconClass}`}
            />
            <p className="text-sm font-medium">{activeConfig.emptyTitle}</p>
            <p className="text-xs mt-1">{activeConfig.emptyDescription}</p>
          </div>
        ) : (
          displayedApprovals.map((text) => (
            <ApprovalItem key={text.id} {...itemProps} text={text} />
          ))
        )}
      </div>
    </div>
  )
}
