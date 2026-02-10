import {
  AlertTriangle,
  BookOpen,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  Trophy,
} from 'lucide-react'
import type { TextPreview } from '../../types/database'

export type LibraryTextListProps = {
  texts: TextPreview[]
  activeTab: 'private' | 'public'
  bestScores: Record<string, number>
  retryingTextIds: Set<string>
  onReadText: (text: TextPreview) => void
  onRetryProcessing: (textId: string) => void
  onEditText: (text: TextPreview) => void
  onDeleteText: (textId: string) => void
  isAdmin?: boolean
}

export function LibraryTextList({
  texts,
  activeTab,
  bestScores,
  retryingTextIds,
  onReadText,
  onRetryProcessing,
  onEditText,
  onDeleteText,
  isAdmin = false,
}: LibraryTextListProps) {
  return (
    <div className="space-y-4">
      {texts.map((text) => (
        <div
          key={text.id}
          className="p-4 bg-bg-secondary rounded-lg border border-text-secondary/20"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-text truncate">
                  {text.title || 'Untitled'}
                </h3>
                {text.processing_status === 'pending' && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-warning/10 text-warning rounded">
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
              <div className="flex items-center gap-2 mb-2">
                {text.fiction !== null && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                    {text.fiction ? 'Fiction' : 'Non-Fiction'}
                  </span>
                )}
                {text.complexity !== null && (
                  <span className="text-xs text-text-secondary">
                    Complexity: {text.complexity}
                  </span>
                )}
                {text.quiz_valid === false && (
                  <span
                    className="flex items-center gap-1 text-xs text-warning"
                    title="Quiz may have quality issues"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Quiz needs review
                  </span>
                )}
                {text.quiz_valid === null &&
                  text.quiz !== null &&
                  text.processing_status === 'completed' && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-warning/10 text-warning rounded">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Validating
                    </span>
                  )}
                {bestScores[text.id] !== undefined && (
                  <>
                    <span className="text-text-secondary/30 mx-1">•</span>
                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                      <Trophy className="w-3 h-3" />
                      <span>{bestScores[text.id]}%</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                {text.preview}...
              </p>
              <p className="text-xs text-text-secondary mt-2">
                Uploaded {new Date(text.uploaded_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {text.processing_status === 'completed' && (
                <button
                  type="button"
                  onClick={() => onReadText(text)}
                  className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Read text"
                  title="Start reading"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              {(text.processing_status === 'failed' ||
                (text.processing_status === 'completed' &&
                  text.quiz_valid === false)) &&
                (activeTab === 'private' || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => onRetryProcessing(text.id)}
                    disabled={retryingTextIds.has(text.id)}
                    className="p-2 text-text-secondary hover:text-warning hover:bg-warning/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-warning disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Retry processing"
                    title="Regenerate quiz"
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
                      className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Edit text"
                      title="Edit text (will regenerate quiz)"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteText(text.id)}
                    className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-error"
                    aria-label="Delete text"
                    title="Delete text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
