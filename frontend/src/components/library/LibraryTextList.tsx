import {
  AlertTriangle,
  BookOpen,
  FileText,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  Trophy,
} from 'lucide-react'
import type { TextPreview } from '../../types/database'
import { UNTITLED_TEXT_FALLBACK } from '../../constants/admin'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { TEXT_PREVIEW_LENGTH } from '../../constants/library'

export type LibraryTextListProps = {
  texts: TextPreview[]
  activeTab: 'private' | 'public'
  bestScores: Record<string, number>
  lastReadDates: Record<string, string>
  retryingTextIds: Set<string>
  onReadText: (text: TextPreview) => void
  onReadSummary: (text: TextPreview) => void
  onRetryProcessing: (textId: string) => void
  onEditText: (text: TextPreview) => void
  onDeleteText: (textId: string) => void
  isAdmin?: boolean
}

export function LibraryTextList({
  texts,
  activeTab,
  bestScores,
  lastReadDates,
  retryingTextIds,
  onReadText,
  onReadSummary,
  onRetryProcessing,
  onEditText,
  onDeleteText,
  isAdmin = false,
}: LibraryTextListProps) {
  const isMobile = useIsMobile()
  const { isOnline } = useNetworkStatus()
  return (
    <div className="space-y-4">
      {texts.map((text) => (
        <div
          key={text.id}
          className="p-4 bg-bg-secondary rounded-lg border border-text-secondary/20"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-text truncate">
                  {text.title || UNTITLED_TEXT_FALLBACK}
                </h3>
                {text.processing_status === 'pending' && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-error/10 text-error rounded">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing
                  </span>
                )}
                {text.processing_status === 'failed' && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-error/10 text-error rounded">
                    <AlertTriangle className="w-3 h-3" />
                    Failed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {text.fiction !== null && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                    {text.fiction ? 'Fiction' : 'Non-Fiction'}
                  </span>
                )}
                {text.sectional && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                    Sectional
                  </span>
                )}
                {text.complexity !== null && (
                  <span className="text-xs text-text-secondary">
                    Complexity: {text.complexity}
                  </span>
                )}
                {text.quiz_valid === false && (
                  <span
                    className="flex items-center gap-1 text-xs text-error"
                    title="Quiz may have quality issues"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Quiz needs review
                  </span>
                )}
                {text.quiz_valid === null &&
                  text.quiz !== null &&
                  text.processing_status === 'completed' && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-error/10 text-error rounded">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Validating
                    </span>
                  )}
                {bestScores[text.id] !== undefined && (
                  <>
                    <span className="text-text-secondary/30 mx-1">•</span>
                    <div className="flex items-center gap-1 text-xs font-medium text-success">
                      <Trophy className="w-3 h-3" />
                      <span>{bestScores[text.id]}%</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                {text.preview.length >= TEXT_PREVIEW_LENGTH
                  ? `${text.preview}...`
                  : text.preview}
              </p>
              <p className="text-xs text-text-secondary mt-2">
                Uploaded {new Date(text.uploaded_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                {text.processing_status === 'completed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onReadText(text)}
                      className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Read text"
                      title="Start reading"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    {!isMobile && text.has_summary && (
                      <button
                        type="button"
                        onClick={() => onReadSummary(text)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Read summary"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Read Summary
                      </button>
                    )}
                  </>
                )}
                {(text.processing_status === 'failed' ||
                  (text.processing_status === 'completed' &&
                    text.quiz_valid === false)) &&
                  (activeTab === 'private' || isAdmin) &&
                  !(
                    text.rejection_stage === 'process_text' &&
                    text.llm_violation_type !== null
                  ) && (
                    <button
                      type="button"
                      onClick={() => onRetryProcessing(text.id)}
                      disabled={!isOnline || retryingTextIds.has(text.id)}
                      className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-error disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Retry processing"
                      title={
                        isOnline ? 'Regenerate quiz' : 'Unavailable offline'
                      }
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${retryingTextIds.has(text.id) ? 'animate-spin' : ''}`}
                      />
                    </button>
                  )}
                {(activeTab === 'private' || isAdmin) && (
                  <>
                    {text.processing_status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => onEditText(text)}
                        disabled={!isOnline}
                        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Edit text"
                        title={
                          isOnline ? 'Edit text or quiz' : 'Unavailable offline'
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteText(text.id)}
                      disabled={!isOnline}
                      className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-error disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Delete text"
                      title={isOnline ? 'Delete text' : 'Unavailable offline'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              {lastReadDates[text.id] && (
                <p className="text-xs text-text-secondary">
                  Last read{' '}
                  {new Date(lastReadDates[text.id]).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
