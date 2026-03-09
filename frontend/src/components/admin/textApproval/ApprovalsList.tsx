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
  onDelete: (textId: string) => void
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
    emptyIconClass: 'text-success/60',
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
  'text-text-secondary hover:text-text hover:bg-text-secondary/10 border border-transparent'
const INACTIVE_BADGE_CLASS = 'bg-text-secondary/10 text-text-secondary'

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
    <div className="bg-bg-secondary/30 border border-text-secondary/10 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-text-secondary/10 flex items-center justify-between bg-text/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded text-primary">
            <Layers size={16} />
          </div>
          <h2 className="font-semibold text-text">Pending Reviews</h2>
        </div>
        <span className="text-xs font-mono text-text-secondary bg-text-secondary/10 px-2 py-1 rounded-full">
          {approvals.length} Pending
        </span>
      </div>

      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex gap-1.5 p-1 bg-bg/30 rounded-xl border border-text-secondary/10">
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

      <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-3">
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
